"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildPayload,
  FIELD_NAMES,
  isHoneypotTripped,
  REQUEST_DIALOG_ID,
  REQUEST_TRIGGER_ATTR,
  validateRequest,
  WEB3FORMS_ENDPOINT,
  type RequestErrors,
  type RequestInput,
} from "@/lib/requestForm";
import { WEB3FORMS_KEY } from "@/lib/requestEnv";
import { SONG_SEARCH_ID } from "@/lib/songFilter";
import { RequestForm } from "./RequestForm";
import styles from "./request-form.module.css";

type Phase = "idle" | "submitting" | "success" | "error";
const FIELD_ORDER = ["song", "artist", "requester", "memo"] as const;

// 전역 dialog 아일랜드 — layout 에 1회 마운트. 문서 위임으로 [data-request-trigger] 클릭을 가로채(showModal),
// 같은 RequestForm 을 fetch 제출한다. no-JS 면 이 리스너가 없어 트리거 <a href="/request"> 가 그냥 navigate(폴백).
export function RequestDialogClient() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const successRef = useRef<HTMLParagraphElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // in-flight 가드 — 제출 중 재진입(더블서브밋) 차단. 버튼 disabled 와 별개로 확실히.
  const submittingRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errors, setErrors] = useState<RequestErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [defaultSong, setDefaultSong] = useState("");
  // 열 때마다 증가 → RequestForm 리마운트(프리필 defaultValue 적용 + 이전 입력 초기화).
  const [openId, setOpenId] = useState(0);

  // 문서 위임(capture) — 트리거 클릭을 다른 핸들러보다 먼저 가로채 navigate 를 막고 dialog 를 연다.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const trigger = target?.closest(`[${REQUEST_TRIGGER_ATTR}]`);
      if (!trigger) return;
      e.preventDefault();
      lastFocusRef.current = trigger as HTMLElement;
      // 프리필: 라이브 검색 입력값(있으면) — router 비동기 갱신과 무관한 DOM 값(stale 0, #3 선례).
      const search = document.getElementById(SONG_SEARCH_ID) as HTMLInputElement | null;
      setDefaultSong(search?.value.trim() ?? "");
      setErrors({});
      setFormError(null);
      setPhase("idle");
      setOpenId((n) => n + 1);
      dialogRef.current?.showModal();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // 열림/단계 변화 시 포커스 — idle=곡 필드, success=성공 메시지(스크린리더 안내).
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg?.open) return;
    if (phase === "success") {
      successRef.current?.focus();
      return;
    }
    if (phase === "idle") {
      const songEl = dlg.querySelector<HTMLElement>(`[name="${FIELD_NAMES.song}"]`);
      songEl?.focus();
    }
  }, [openId, phase]);

  function close() {
    dialogRef.current?.close();
  }

  // 백드롭 클릭 → 닫기. dialog 요소는 전체 뷰포트 레이어이고 패널은 자식(.dialogInner)이므로,
  // 클릭 target 이 dialog 자신이면(=패널 바깥) 닫는다. 패널/자식 클릭은 target 이 descendant 라 유지.
  function onDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) close();
  }

  // dialog close(ESC·close())→ in-flight 제출 취소 + 트리거로 포커스 복귀.
  // 모든 닫기 경로(ESC·close())가 native 'close' 이벤트로 여길 거치므로 정리도 여기서 일괄.
  function onClose() {
    abortRef.current?.abort();
    submittingRef.current = false;
    lastFocusRef.current?.focus();
    lastFocusRef.current = null;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingRef.current) return; // in-flight 중 재진입 차단(더블서브밋)
    const form = e.currentTarget;
    const data = new FormData(form);

    // honeypot — 봇이면 전송하지 않고 조용히 성공처럼(피드백으로 회피 학습 방지).
    if (isHoneypotTripped(data.get(FIELD_NAMES.honeypot))) {
      setPhase("success");
      return;
    }

    const input: RequestInput = {
      song: String(data.get(FIELD_NAMES.song) ?? ""),
      artist: String(data.get(FIELD_NAMES.artist) ?? ""),
      requester: String(data.get(FIELD_NAMES.requester) ?? ""),
      memo: String(data.get(FIELD_NAMES.memo) ?? ""),
    };

    const found = validateRequest(input);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const firstInvalid = FIELD_ORDER.find((k) => found[k]);
      if (firstInvalid) {
        const el = form.elements.namedItem(FIELD_NAMES[firstInvalid]);
        if (el instanceof HTMLElement) el.focus();
      }
      return;
    }

    setErrors({});
    setFormError(null);
    setPhase("submitting");
    submittingRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(WEB3FORMS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(buildPayload(input, WEB3FORMS_KEY)),
        signal: controller.signal,
      });
      const json = (await res.json()) as { success?: boolean };
      // Web3Forms 는 항상 {success: boolean} 반환. 명시적 === true 로 의도 분명히(undefined=실패 취급).
      if (res.ok && json.success === true) {
        setPhase("success");
      } else {
        setPhase("error");
        setFormError("제보 전송에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      // 닫기로 인한 중단(abort)이면 무시 — dialog 이미 닫혔고 onClose 가 정리함.
      if (controller.signal.aborted) return;
      setPhase("error");
      setFormError("네트워크 오류로 제보를 보내지 못했어요. 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <dialog
      ref={dialogRef}
      id={REQUEST_DIALOG_ID}
      className={styles.dialog}
      role="dialog"
      aria-labelledby="request-dialog-title"
      onClick={onDialogClick}
      onClose={onClose}
    >
      <div className={`tf-panel ${styles.dialogInner}`}>
        <div className={`tf-panel__head ${styles.dialogHead}`}>
          <h2 id="request-dialog-title" className={`tf-panel__title ${styles.dialogTitle}`}>
            곡 제보
          </h2>
          <button
            type="button"
            className={styles.close}
            onClick={close}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {phase === "success" ? (
          <div className={styles.success} role="status">
            <p className={styles.successMsg} tabIndex={-1} ref={successRef}>
              제보 고마워요
              <br />
              확인하고 곧 패치로 만들어 둘게요.
            </p>
            <div className={styles.successActions}>
              <button type="button" className={`tf-btn tf-btn--primary ${styles.submit}`} onClick={close}>
                닫기
              </button>
              <button
                type="button"
                className={`tf-btn tf-btn--ghost ${styles.ghost}`}
                onClick={() => {
                  setDefaultSong("");
                  setPhase("idle");
                  setOpenId((n) => n + 1);
                }}
              >
                또 제보
              </button>
            </div>
          </div>
        ) : (
          <RequestForm
            key={openId}
            mode="island"
            accessKey={WEB3FORMS_KEY}
            defaultSong={defaultSong}
            submitting={phase === "submitting"}
            errors={errors}
            formError={formError}
            onSubmit={onSubmit}
          />
        )}
      </div>
    </dialog>
  );
}
