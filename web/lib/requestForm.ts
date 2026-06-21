// request-form 의 단일 출처 순수 모듈 — DOM·React·env 무관. 두 소비자(native /request 폼, dialog 아일랜드)가
// 공유하는 상수·검증·payload·honeypot 로직. 전수 테스트 가능(docs/trd/request-form.md "requestForm 계약").

export const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

// DOM id / 속성 계약 — 서버 정적 요소 ↔ 아일랜드(getElementById/위임) 연결(드리프트 방지, #2/#3 교훈).
export const REQUEST_DIALOG_ID = "request-dialog";
export const REQUEST_FORM_ID = "request-form";
export const REQUEST_STATUS_ID = "request-status";
export const REQUEST_TRIGGER_ATTR = "data-request-trigger";

// 폼 필드 name — Gmail 에 그대로 라벨로 찍히므로 한국어(이메일 가독성). native 폼·island payload 가 공유.
export const FIELD_NAMES = {
  song: "곡",
  artist: "아티스트",
  requester: "요청자",
  memo: "메모",
  /** honeypot — Web3Forms 예약 필드. 봇이 채우면 거부. */
  honeypot: "botcheck",
} as const;

export const MAX_LEN = {
  song: 100,
  artist: 100,
  requester: 100,
  memo: 1000,
} as const;

export const FROM_NAME = "GP-150 톤 라이브러리 제보";
/** native(no-JS) 폼의 정적 subject — island 은 buildPayload 가 곡/아티스트로 동적 생성. */
export const NATIVE_SUBJECT = "곡 제보 — GP-150 톤 라이브러리";

export interface RequestInput {
  song: string;
  artist: string;
  requester: string;
  memo: string;
}

export type RequestErrors = Partial<Record<keyof RequestInput, string>>;

/** 곡·아티스트는 필수, 전 필드 길이 상한. trim 후 빈값/초과면 에러 메시지. 통과면 {}. */
export function validateRequest(input: RequestInput): RequestErrors {
  const errors: RequestErrors = {};
  const song = input.song.trim();
  const artist = input.artist.trim();

  if (!song) errors.song = "곡 이름을 입력하세요";
  else if (song.length > MAX_LEN.song) errors.song = `곡 이름은 ${MAX_LEN.song}자 이내로`;

  if (!artist) errors.artist = "아티스트를 입력하세요";
  else if (artist.length > MAX_LEN.artist)
    errors.artist = `아티스트는 ${MAX_LEN.artist}자 이내로`;

  if (input.requester.trim().length > MAX_LEN.requester)
    errors.requester = `요청자는 ${MAX_LEN.requester}자 이내로`;

  if (input.memo.trim().length > MAX_LEN.memo)
    errors.memo = `메모는 ${MAX_LEN.memo}자 이내로`;

  return errors;
}

/** 단순 이메일 형식 판정 — 참이면 Web3Forms replyto 로 매핑(답장용). */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** honeypot 값이 비어있지 않으면(=봇이 채움) true. */
export function isHoneypotTripped(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  return value === true;
}

/** RequestInput → Web3Forms 제출 payload. 요청자/메모는 값 있을 때만, 이메일이면 replyto, siteUrl 있으면 redirect. */
export function buildPayload(
  input: RequestInput,
  accessKey: string,
  siteUrl?: string,
): Record<string, string> {
  const song = input.song.trim();
  const artist = input.artist.trim();
  const requester = input.requester.trim();
  const memo = input.memo.trim();

  const payload: Record<string, string> = {
    access_key: accessKey,
    subject: `곡 제보: ${song} / ${artist}`,
    from_name: FROM_NAME,
    [FIELD_NAMES.song]: song,
    [FIELD_NAMES.artist]: artist,
  };
  if (requester) payload[FIELD_NAMES.requester] = requester;
  if (memo) payload[FIELD_NAMES.memo] = memo;
  if (isEmail(requester)) payload.replyto = requester;
  if (siteUrl) payload.redirect = `${siteUrl.replace(/\/+$/, "")}/request/sent`;

  return payload;
}
