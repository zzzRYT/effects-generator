# TRD — request-form

- **Feature slug**: request-form
- **PRD**: docs/prd/request-form.md
- **설계**: docs/plans/2026-06-21-request-form-design.md

## 설계 요약
곡 제보 폼을 **점진적 향상**으로. 폼 마크업(`RequestForm`) 1개를 두 경로가 공유한다: (a) no-JS = 실제 정적
`/request` 페이지에서 `<form action=Web3Forms method=POST>` 네이티브 제출, (b) JS = 전역 `<dialog>` 가 같은
폼을 열어 `fetch` 로 제출(페이지 이동 0). 제출은 Web3Forms 엔드포인트로 직접 가 Gmail 도착 — **백엔드·API 라우트 0**.

트리거는 진짜 `<a href="/request" data-request-trigger>`(빈상태 + 전역 `<footer>`). 전역 아일랜드
`RequestDialogClient`(layout 1회 마운트)가 `[data-request-trigger]` 클릭을 **문서 위임**으로 가로채 `dialog.showModal()`.
아일랜드 없으면(no-JS) 링크가 그냥 navigate. **닫힌 `<dialog>` 는 native `display:none`** 이라 별도 CSS 게이트
불필요(설계 R2) — `<a href>` 가 폴백 전부.

순수 로직(검증·payload·honeypot·이메일판정)과 env 키 해석은 `web/lib/` 순수 모듈로 분리해 전수 테스트한다.

## 설계 대비 정제 (refinements)
- **R1 프리필 = dialog 전용**: 검색 input 에 공유 `SONG_SEARCH_ID` 부여 → 아일랜드가 open 시
  `getElementById(SONG_SEARCH_ID).value`(라이브 값, stale 0 — #3 선례)로 곡 필드 채움. 설계의 `/request?song=`
  페이지측 프리필은 **드롭(YAGNI**: JS 사용자는 dialog 로 가지 /request 로 navigate 안 함). `/request` 는 완전 정적(아일랜드 0).
- **R2 CSS 게이트 불필요**: 닫힌 `<dialog>` 가 이미 숨김 → `:global(html.js)` 신규 소비자 없음. layout 의 기존 PE 스크립트는 그대로.

## 컴포넌트 구조
```
web/
  app/
    layout.tsx                          # (수정) <Footer/> + <RequestDialogClient/> 마운트(전역)
    request/page.tsx                    # 정적: <RequestForm mode="native"> + 제목 (no-JS 작동)
    request/sent/page.tsx               # 정적 thank-you (추후 redirect 도착지)
  components/
    request-form/
      RequestForm.tsx                   # 공유 프레젠테이셔널 폼(서버·클라 양용, hook 없음)
      RequestDialogClient.tsx ('use client') # <dialog>+문서위임+fetch 제출+상태기계+포커스/ESC/락
      RequestLink.tsx                   # 재사용 트리거 <a href="/request" data-request-trigger>
      request-form.module.css
    layout/Footer.tsx                   # 시맨틱 <footer> + RequestLink
  lib/
    requestForm.ts                      # 순수: 상수·validateRequest·buildPayload·isHoneypotTripped·isEmail
    requestEnv.ts                       # resolveWeb3FormsKey(raw, nodeEnv) — fail-fast / placeholder
```

## 파일 목록 (생성/수정)
| 파일 | 역할 |
|------|------|
| web/lib/requestForm.ts | 순수 함수·상수(필드명·DOM id·ENDPOINT·maxlen). 단일 출처 |
| web/lib/requestEnv.ts | `resolveWeb3FormsKey` — prod 부재 fail-fast, dev/test placeholder |
| web/lib/__tests__/requestForm.test.ts | validate·buildPayload·honeypot·isEmail 전수 |
| web/lib/__tests__/requestEnv.test.ts | 키 해석(있음/없음×prod/test) |
| web/components/request-form/RequestForm.tsx | 폼 마크업 + 숨김 Web3Forms 필드 + honeypot. mode·onSubmit·errors·defaultSong |
| web/components/request-form/RequestDialogClient.tsx | 'use client': dialog·위임·fetch·상태·포커스·프리필 |
| web/components/request-form/RequestLink.tsx | 트리거 `<a>` |
| web/components/request-form/request-form.module.css | 폼·dialog·백드롭·상태·반응형·reduced-motion |
| web/components/layout/Footer.tsx | 전역 `<footer>` |
| web/app/request/page.tsx | 정적 /request (native 폼) |
| web/app/request/sent/page.tsx | 정적 thank-you |
| web/components/__tests__/RequestForm.test.tsx | 필드·required·maxlen·숨김필드·honeypot·native action |
| web/components/__tests__/RequestDialog.test.tsx | 트리거 open·fetch 성공/실패·ESC·빈제출 차단·프리필(jsdom, fetch mock) |
| web/e2e/request-form.spec.ts (+ snapshots) | no-JS·dialog·4bp 비주얼·axe·reduced-motion·포커스 |
| web/.env.example | `NEXT_PUBLIC_WEB3FORMS_KEY` placeholder 문서화(추적) |
| web/app/layout.tsx | (수정) Footer + RequestDialogClient |
| web/components/song-index/SongIndex.tsx | (수정) 빈상태에 RequestLink |
| web/lib/songFilter.ts | (수정) `SONG_SEARCH_ID` 상수 추가 |
| web/components/song-index/SongFilterClient.tsx | (수정) 검색 input 에 `id={SONG_SEARCH_ID}` |
| web/.gitignore | (수정) `!.env.example` 부정 추가 |

## 데이터 흐름 / 타입
```ts
interface RequestInput { song: string; artist: string; requester: string; memo: string }
type RequestErrors = Partial<Record<keyof RequestInput, string>>  // 필드→에러 메시지
```
- **native(/request)**: 브라우저가 `<form>` 의 보이는+숨김 필드를 Web3Forms 로 직접 POST. 숨김: `access_key`
  (`WEB3FORMS_KEY`)·`subject`(정적 "곡 제보 — GP-150 톤 라이브러리")·`from_name`·`botcheck`. 네이티브 검증.
- **island(dialog)**: onSubmit→`preventDefault`→폼에서 `RequestInput` 수집→`isHoneypotTripped` 가드→
  `validateRequest` (실패면 인라인 에러·첫 무효 포커스)→`buildPayload(input, WEB3FORMS_KEY)` (동적 subject +
  요청자 이메일이면 `replyto`)→`fetch(ENDPOINT,{method:POST, headers:{"Content-Type":"application/json",
  Accept:"application/json"}, body: JSON})`→`res.json().success` 로 성공/에러 분기.
- 새 외부 타입 없음. `patches.generated.ts`·`types.ts` 무관(제보는 입력 폼, 패치 데이터 안 읽음).

## requestForm 계약 (순수)
```
상수: WEB3FORMS_ENDPOINT="https://api.web3forms.com/submit"
      REQUEST_DIALOG_ID·REQUEST_FORM_ID·REQUEST_STATUS_ID·REQUEST_TRIGGER_ATTR="data-request-trigger"
      필드명 song/artist/requester/memo, MAX_{SONG,ARTIST,REQUESTER}=100, MAX_MEMO=1000

validateRequest(i: RequestInput): RequestErrors
  song   = trim 빈 → "곡 이름을 입력하세요"        | 길이>100 → "100자 이내"
  artist = trim 빈 → "아티스트를 입력하세요"       | 길이>100 → "100자 이내"
  requester 길이>100 / memo 길이>1000 → 각 메시지. 통과면 {}.

isEmail(s): /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

isHoneypotTripped(botcheck: unknown): boolean   // 비어있지 않으면 true(봇)

buildPayload(i, accessKey, siteUrl?): Record<string,string>
  { access_key, subject:`곡 제보: ${곡} / ${아티스트}`, from_name:"GP-150 톤 라이브러리 제보",
    song, artist, ...(requester?{requester}), ...(memo?{memo}),
    ...(isEmail(requester)?{replyto:requester}), ...(siteUrl?{redirect:`${siteUrl}/request/sent`}) }
```

## requestEnv 계약
```
resolveWeb3FormsKey(raw: string|undefined, nodeEnv: string|undefined): string
  raw?.trim() 있으면 그 값. 없고 nodeEnv==="production" → throw(친절 메시지). 아니면 "test-placeholder-key".
export const WEB3FORMS_KEY = resolveWeb3FormsKey(process.env.NEXT_PUBLIC_WEB3FORMS_KEY, process.env.NODE_ENV)
```
> `process.env.NEXT_PUBLIC_*` 직접 접근이라 Next 가 빌드 때 리터럴 인라인. dev/QA 는 `.env.local` 에 placeholder
> 두면 prod 빌드도 통과(부재일 때만 fail-fast). 실제 키는 사용자가 Vercel/`.env.local` 에 설정.

## RequestDialogClient 동작 (아일랜드)
- layout 에 1회. 마운트 시 `document.addEventListener("click", …)` 위임: `target.closest([data-request-trigger])`
  면 `preventDefault` → `dialog.showModal()` → **프리필**: `getElementById(SONG_SEARCH_ID)?.value` 있으면 곡 필드에.
- `<dialog id={REQUEST_DIALOG_ID}>` 안에 `<RequestForm mode="island" onSubmit errors>`. 상태:
  `useState<{phase:"idle"|"submitting"|"success"|"error"; errors; message?}>`.
- 제출: 위 데이터 흐름. 성공 → phase="success"(폼 자리 성공 메시지 + 닫기/또 제보, 성공 제목 포커스).
  실패 → phase="error"(인라인 배너 + 입력 보존 + 재시도). 제출 중 버튼 disabled(더블클릭 방지)·aria-busy.
- 닫기: ESC(native dialog)·백드롭 클릭(`dialog` 클릭 좌표가 폼 밖)·닫기 버튼 → `dialog.close()` → 트리거로 포커스 복귀
  (open 직전 `document.activeElement` 저장). 포커스 트랩은 native `<dialog>` modal 이 제공(showModal).
- reduced-motion: CSS 가 dialog/백드롭 트랜지션 제거. 스크롤 락: `showModal` 기본 + body overflow(필요 시).

## 상태 / 엣지케이스
- 키 부재: prod 빌드 fail-fast(AC15) / dev·test placeholder. → `requestEnv.test`.
- SITE_URL 부재(현재): `buildPayload` 가 `redirect` 생략 → no-JS 성공 시 Web3Forms 기본 성공페이지(수용).
- 제출 중 재클릭: 버튼 disabled. 오프라인/`success:false`: error phase, 값 보존, 재시도.
- honeypot 채워짐: island 은 전송 안 함(가드), native 는 Web3Forms 가 거부.
- 트리거가 검색 input 없는 페이지(곡상세)에서: 프리필 소스 null → 빈 곡 필드(graceful).
- `/request/sent` 직접 방문: 정적 thank-you, 무해. dialog 미열림 상태로 새로고침: 닫힘(native).
- 긴 입력: maxlength 캡. 곡/아티스트만 required, 요청자·메모 선택.

## 수용 기준 ↔ 구현·테스트 매핑
| PRD 기준 | 구현 | 테스트 |
|----------|------|--------|
| AC1 4필드·required·maxlen | RequestForm | RequestForm.test |
| AC2 validateRequest | requestForm.ts | requestForm.test |
| AC3 buildPayload(replyto/redirect 조건부) | requestForm.ts | requestForm.test |
| AC4 no-JS /request 네이티브 POST | RequestForm native + request/page | e2e javaScriptEnabled:false + route mock |
| AC5 dialog open + 곡 포커스 | RequestDialogClient | e2e + RequestDialog.test |
| AC6 fetch 성공 인라인·이동 0 | RequestDialogClient | e2e route mock + RequestDialog.test |
| AC7 실패 에러·값 보존 | 상태기계 error | RequestDialog.test, e2e |
| AC8 ESC·백드롭·닫기·포커스 복귀 | dialog close | e2e |
| AC9 포커스 트랩·axe 0 | native dialog modal | e2e axe |
| AC10 honeypot 숨김·isHoneypotTripped | RequestForm + requestForm.ts | requestForm.test + e2e(탭 순회) |
| AC11 프리필(라이브 값)·no-JS 빈폼 | RequestDialogClient + SONG_SEARCH_ID | e2e + RequestDialog.test |
| AC12 4bp 비주얼·터치≥44px | request-form.module.css | e2e 스냅샷 |
| AC13 reduced-motion | css | e2e |
| AC14 정적·API 0 | 정적 라우트 + 아일랜드 격리 | next build 로그 |
| AC15 키 부재 fail-fast | requestEnv | requestEnv.test |

## 테스트 계획
- **유닛(Vitest, 80%+)**: requestForm(validate 전 분기·buildPayload 조합·honeypot·isEmail 경계), requestEnv(4 조합).
- **컴포넌트(RTL+jsdom)**: RequestForm(필드·required·maxlen·숨김 Web3Forms 필드·honeypot aria-hidden/tabindex·native
  action·island onSubmit), RequestDialog(트리거 위임 open·프리필·fetch mock 성공/실패·빈 제출 차단·ESC). fetch·dialog
  (jsdom `HTMLDialogElement` 폴리필/스텁) mock.
- **E2E(Playwright 320/375/768/1024/1440)**: ①no-JS /request 채움→제출(Web3Forms route mock)→요청 도달, 빈값 차단.
  ②dialog: 홈 빈상태·푸터 트리거→open→프리필→제출 mock→인라인 성공·URL 불변, ESC/백드롭 닫기·포커스 복귀.
  ③실패 mock→에러·재시도. ④비주얼 스냅샷(/request, dialog-open) 4bp. ⑤axe=0(폼·dialog). ⑥reduced-motion. ⑦honeypot 탭 제외.

## 새 의존성 (있으면 근거)
- **없음.** Web3Forms 는 외부 HTTP 엔드포인트(라이브러리 아님 — `fetch`/네이티브 `<form>` 직접). 검증·payload 는 작은
  순수 함수로 충분(Zod 등 불필요 — 4필드·단순 규칙, 번들예산). `<dialog>` 는 네이티브 HTML(모달 라이브러리 회피).
```
