// 동적 카탈로그 slug — artist+title 에서 결정적으로 파생.
// 정적 시절 slug 는 파일명 기반(한글 곡도 로마자 파일명)이라 artist/title 에서 역산 불가 →
// 동적에선 균일하게 slugify(artist+title) 로 새로 만들고, slug→곡 해석은 같은 함수로 매칭(자기일관).
// 한글 보존(퍼센트 인코딩 URL). 후일 로마자화/슬러그 컬럼으로 개선 가능.

export function songSlug(artist: string, title: string): string {
  return `${artist} ${title}`
    .normalize("NFC") // 한글/악센트 합성형 고정 — URL 라우트 param 과 결정적 비교(NFD 불일치 방지)
    .toLowerCase()
    .replace(/['’`]/g, "") // 어포스트로피(직선·곱슬) 제거: don't / don’t → dont
    .replace(/[^a-z0-9가-힣]+/g, "-") // 영숫자·한글 외 런 → 하이픈
    .replace(/^-+|-+$/g, ""); // 양끝 하이픈 제거
}
