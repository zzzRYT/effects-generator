// Web3Forms access key 해석 — 빌드 타임 인라인되는 NEXT_PUBLIC 값을 읽되, prod 빌드에서 부재면 fail-fast.
// 키는 설계상 공개(클라이언트에 인라인되는 라우팅 키, 자격증명 아님)이나 repo 밖(.env.local/Vercel)에 둔다.
// Next 는 미설정 NEXT_PUBLIC 변수를 빈 문자열로 치환하므로 빈값도 '부재'로 취급한다(docs/trd 참조).

/**
 * @param raw     process.env.NEXT_PUBLIC_WEB3FORMS_KEY (미설정 시 "" 또는 undefined)
 * @param nodeEnv process.env.NODE_ENV
 * @returns       유효 키. 부재 + production 이면 throw, 그 외 부재는 placeholder.
 */
export function resolveWeb3FormsKey(
  raw: string | undefined,
  nodeEnv: string | undefined,
): string {
  const key = raw?.trim();
  if (key) return key;
  if (nodeEnv === "production") {
    throw new Error(
      "NEXT_PUBLIC_WEB3FORMS_KEY 미설정 — web/.env.local 또는 Vercel 환경변수에 Web3Forms access key 를 설정하세요.",
    );
  }
  return "test-placeholder-key";
}

// process.env.NEXT_PUBLIC_* 직접 접근이라 Next 가 빌드 때 리터럴로 인라인한다.
export const WEB3FORMS_KEY = resolveWeb3FormsKey(
  process.env.NEXT_PUBLIC_WEB3FORMS_KEY,
  process.env.NODE_ENV,
);
