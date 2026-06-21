import {
  FIELD_NAMES,
  FROM_NAME,
  MAX_LEN,
  NATIVE_SUBJECT,
  REQUEST_FORM_ID,
  WEB3FORMS_ENDPOINT,
  type RequestErrors,
} from "@/lib/requestForm";
import styles from "./request-form.module.css";

// 곡 제보 폼 — native(no-JS /request)와 island(dialog) 가 공유하는 프레젠테이셔널 마크업. hook 없음(서버·클라 양용).
//  native : <form action=Web3Forms method=POST> + 숨김필드, 브라우저 네이티브 검증.
//  island : noValidate + onSubmit(아일랜드가 fetch). 인라인 에러/제출중 상태는 props 로 주입.
interface RequestFormProps {
  mode: "native" | "island";
  /** Web3Forms access key — native 숨김필드용. */
  accessKey: string;
  /** 곡 필드 초기값(island 프리필 — key 리마운트로 적용). */
  defaultSong?: string;
  /** island 제출 중 — 버튼 비활성 + aria-busy. */
  submitting?: boolean;
  /** island 필드별 인라인 에러. */
  errors?: RequestErrors;
  /** island 폼 레벨 에러 배너(네트워크·서버 실패). */
  formError?: string | null;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}

const IDS = {
  song: "rf-song",
  artist: "rf-artist",
  requester: "rf-requester",
  memo: "rf-memo",
} as const;

export function RequestForm({
  mode,
  accessKey,
  defaultSong,
  submitting = false,
  errors = {},
  formError = null,
  onSubmit,
}: RequestFormProps) {
  const isIsland = mode === "island";
  const describe = (field: keyof typeof IDS): string | undefined =>
    errors[field] ? `${IDS[field]}-error` : undefined;

  return (
    <form
      id={REQUEST_FORM_ID}
      className={styles.form}
      method="POST"
      action={isIsland ? undefined : WEB3FORMS_ENDPOINT}
      onSubmit={onSubmit}
      noValidate={isIsland}
      aria-busy={submitting || undefined}
    >
      {/* native 전용 숨김 Web3Forms 필드 — island 은 fetch 로 payload 를 직접 구성하므로 불필요. */}
      {!isIsland && (
        <>
          <input type="hidden" name="access_key" value={accessKey} />
          <input type="hidden" name="subject" value={NATIVE_SUBJECT} />
          <input type="hidden" name="from_name" value={FROM_NAME} />
        </>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor={IDS.song}>
          곡 <span className={styles.req} aria-hidden="true">*</span>
        </label>
        <input
          id={IDS.song}
          className={styles.input}
          name={FIELD_NAMES.song}
          type="text"
          required
          maxLength={MAX_LEN.song}
          defaultValue={defaultSong}
          autoComplete="off"
          aria-invalid={errors.song ? true : undefined}
          aria-describedby={describe("song")}
        />
        {errors.song && (
          <span id={`${IDS.song}-error`} className={styles.error} role="alert">
            {errors.song}
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={IDS.artist}>
          아티스트 <span className={styles.req} aria-hidden="true">*</span>
        </label>
        <input
          id={IDS.artist}
          className={styles.input}
          name={FIELD_NAMES.artist}
          type="text"
          required
          maxLength={MAX_LEN.artist}
          autoComplete="off"
          aria-invalid={errors.artist ? true : undefined}
          aria-describedby={describe("artist")}
        />
        {errors.artist && (
          <span id={`${IDS.artist}-error`} className={styles.error} role="alert">
            {errors.artist}
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={IDS.requester}>
          요청자 <span className={styles.optional}>(이름 또는 이메일, 선택)</span>
        </label>
        <input
          id={IDS.requester}
          className={styles.input}
          name={FIELD_NAMES.requester}
          type="text"
          maxLength={MAX_LEN.requester}
          autoComplete="off"
          aria-invalid={errors.requester ? true : undefined}
          aria-describedby={describe("requester")}
        />
        {errors.requester && (
          <span id={`${IDS.requester}-error`} className={styles.error} role="alert">
            {errors.requester}
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={IDS.memo}>
          메모 <span className={styles.optional}>(선택)</span>
        </label>
        <textarea
          id={IDS.memo}
          className={styles.textarea}
          name={FIELD_NAMES.memo}
          rows={3}
          maxLength={MAX_LEN.memo}
          placeholder="원하는 톤·버전·앨범 등(선택)"
          aria-invalid={errors.memo ? true : undefined}
          aria-describedby={describe("memo")}
        />
        {errors.memo && (
          <span id={`${IDS.memo}-error`} className={styles.error} role="alert">
            {errors.memo}
          </span>
        )}
      </div>

      {/* honeypot — 봇이 채우면 거부. 화면 밖 + 탭/접근성 트리 제외. */}
      <input
        type="checkbox"
        name={FIELD_NAMES.honeypot}
        className={styles.honeypot}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={submitting}>
        {submitting ? "보내는 중…" : "제보 보내기"}
      </button>
    </form>
  );
}
