# 설계 — request-form (트랙2 사이클 #4)

**확정일:** 2026-06-21
**brainstorm:** `/superpowers:brainstorm request-form`
**선행:** #0 파서, #1 곡 상세(`/songs/[rig]/[song]`), #2 변주 탭, #3 곡 목록/검색(홈). 트랙2 **마지막** 사이클.
**소비 계약:** `docs/verification-rubric.md`(특히 핵심 플로우 "제보 폼 제출"), 전역 web 규칙(PE·시맨틱·불변·CSS 토큰).

곡 제보 폼(곡·아티스트·요청자·메모) → **Web3Forms 폼-투-이메일** → Gmail. **백엔드 0.** 100% 정적.
"가치를 보여준 뒤 제보" — #1~#3 으로 톤을 본 사용자가 없는 곡을 제보하는 마지막 진입점.

---

## 확정 결정 (brainstorm)

1. **표현 = `<dialog>` 모달**, 단 **no-JS 폴백 = 실제 `/request` 정적 페이지로 강등**.
   - 트리거는 진짜 `<a href="/request">`. no-JS 면 `/request` 로 navigate(네이티브 POST 작동). JS 면 클릭을
     가로채 같은 폼을 `<dialog>` 오버레이로(페이지 이동 0). → #2/#3 의 PE 골격(서버 정적 + JS 아일랜드 강화) 계승.
   - (기각: CSS `:target` 순수 모달 — no-JS 뒤로가기·포커스 의미 약함. 기각: JS 전용 모달 — no-JS 폴백 부재.)
2. **백엔드 0 = 폼이 Web3Forms 로 직접 POST**. API 라우트 없음 → SSG 유지.
3. **폼 컴포넌트 1개**(`RequestForm`)를 `/request` 라우트와 `<dialog>` 가 공유(DRY). 제출 경로만 모드로 분기:
   - `mode="native"` → `<form action method=POST>`(no-JS·/request).
   - `mode="island"` → dialog 안에서 fetch 핸들러가 가로챔.
4. **전역 진입점 2곳**: ① song-index 빈상태("이 곡 제보하기 →") ② 신설 시맨틱 `<footer>`(layout 1회 편집).
   트리거는 **문서 위임** 1곳(`RequestDialogClient`)이 `[data-request-trigger]` 전역 수신 → 어디든 추가 가능.
5. **프리필 = 가볍게**(JS 전용 향상). dialog 열 때 #3 의 라이브 검색 input 값을 곡 필드에 채움(레이스 세이프,
   `inputRef.current.value` 직접 읽기). `/request` 링크는 `?song=<q>` 캐리 → 페이지 아일랜드가 곡 prefill.
   no-JS `/request` 직접 방문은 빈 폼(정적이라 쿼리 프리필 불가 — 수용).
6. **요청자 필드 = "이름 또는 이메일" 한 칸**(optional). 값이 이메일 형식이면 Web3Forms `replyto` 로 매핑(답장 가능).
7. **NEXT_PUBLIC_SITE_URL 은 추후**: 지금은 `redirect` 필드 생략 → no-JS 제출은 Web3Forms 기본 성공페이지로 폴백.
   SITE_URL 생기면 `redirect=<SITE_URL>/request/sent`(브랜디드 thank-you)로 전환(코드는 조건부로 미리 대비).

---

## 섹션 1 — 아키텍처 & PE 모델

```
사용자 진입:
  (a) song-index 빈상태  "검색 결과 없음 · [이 곡 제보하기 →]"
  (b) 전역 <footer>      "곡 제보"
        └─ 둘 다 <a href="/request" data-request-trigger>   ← PE 이음새

no-JS:  /request 정적 페이지로 이동 → <form action=web3forms method=POST>
        → Web3Forms → Gmail (현재: Web3Forms 기본 성공페이지 / 추후: redirect → /request/sent)

JS:     RequestDialogClient(아일랜드)가 [data-request-trigger] 클릭 위임 가로채기
        → preventDefault → <dialog>.showModal() (같은 RequestForm, mode=island)
        → fetch(web3forms, Accept: json) → 인라인 성공/에러 (페이지 이동 0)
        → ESC·백드롭·포커스 트랩·스크롤 락·reduced-motion
```

- **서버가 정적 진실**: `/request` 페이지의 `RequestForm`(native) 은 완전 동작 폼. layout 의 `<dialog>` 마크업도
  서버가 그리되 `:global(html.js)` 게이트로 no-JS 면 숨김(트리거는 그냥 navigate).
- **JS 아일랜드는 강화만**: 트리거 가로채기·dialog 열기·fetch 제출. 아일랜드 없어도 폼은 살아있음.
- **PE 게이트 재사용**: `app/layout.tsx` 의 무플래시 `html.js` 스크립트(#2/#3 공유). 새 CSS 가 이 게이트의 소비자 3번째.

---

## 섹션 2 — 컴포넌트 & 파일

```
web/lib/
  requestForm.ts            # 순수: 상수(필드명·DOM id·WEB3FORMS_ENDPOINT·maxlen·검증규칙),
    __tests__/requestForm.test.ts   #   validateRequest()→에러맵, buildPayload(input,key,siteUrl?),
                            #   isHoneypotTripped(), isEmail(). 단일 출처(#2/#3 교훈)
web/components/request-form/
  RequestForm.tsx           # 프레젠테이셔널 폼(서버 렌더). 곡·아티스트·요청자·메모 + Web3Forms 숨김필드
                            #   + honeypot. props: mode 'native'|'island', defaultSong?
  RequestDialogClient.tsx   # 'use client' 아일랜드: <dialog> + 문서위임 트리거 + fetch 제출
                            #   + 상태기계(idle/submitting/success/error) + 포커스/ESC/스크롤락
  RequestLink.tsx           # 재사용 트리거 <a href="/request" data-request-trigger>
  request-form.module.css
web/components/layout/
  Footer.tsx                # 시맨틱 <footer> + RequestLink (전역 진입점)
web/app/request/
  page.tsx                  # 정적 /request — <RequestForm mode="native"> + 제목 (no-JS 작동)
  sent/page.tsx             # 정적 thank-you (추후 redirect 도착지; 지금도 직접 방문 무해)
```

**편집(기존)**: `app/layout.tsx`(Footer + RequestDialogClient), `components/song-index/SongIndex.tsx`(빈상태
RequestLink + `?song=` 캐리), `web/.env.example`(신설·추적), `web/.gitignore`(`!.env.example` 추가).

---

## 섹션 3 — Web3Forms 계약 & 시크릿

```
endpoint: https://api.web3forms.com/submit   (POST)
숨김필드:  access_key   process.env.NEXT_PUBLIC_WEB3FORMS_KEY (빌드 인라인)
          subject      "곡 제보: <곡> / <아티스트>"
          from_name    "GP-150 톤 라이브러리 제보"
          replyto      요청자값이 이메일이면 그 값 (아니면 생략)
          botcheck     honeypot (봇이 채우면 Web3Forms 거부)
          redirect     <SITE_URL>/request/sent  ← SITE_URL 있을 때만(현재 생략)
보이는필드: 곡*(required,max100) 아티스트*(required,max100) 요청자(max100) 메모(max1000)
```

- **두 제출 경로**: native(`<form action method=POST>`, Web3Forms 가 성공페이지/redirect 처리) /
  island(`Accept: application/json` FormData POST → `{success:true}` → 인라인).
- **시크릿/env**: 키는 **설계상 공개**(클라이언트 인라인 불가피한 라우팅키, 자격증명 아님). 그래도 CLAUDE.md 대로 repo 밖.
  - `web/.env.local`(gitignored) = 실제 `NEXT_PUBLIC_WEB3FORMS_KEY`. (SITE_URL 추후.)
  - `web/.env.example`(추적) = placeholder 문서화. `.gitignore` 에 `!.env.example`.
  - 키 읽는 모듈: 프로덕션 빌드 부재 시 fail-fast, dev/test 는 placeholder 허용(테스트가 실제 키 없이 돈다).
  - 실제 키는 사용자가 web3forms.com 에서 `jinjinstar3@gmail.com` 연결해 발급·`.env.local`+Vercel 에 직접 설정.

---

## 섹션 4 — 검증 · 스팸 · 상태

**검증(이중)**: no-JS = 네이티브 `required`/`maxlength`(브라우저가 차단). JS = `validateRequest()` 순수함수 →
아일랜드가 fetch 전 인라인 에러(`aria-invalid`+`aria-describedby`), 첫 무효 필드 포커스.

**스팸**(security 규칙: honeypot > CAPTCHA): Web3Forms 네이티브 honeypot `botcheck`(시각 숨김·`aria-hidden`·
`tabindex=-1`·off-screen). 아일랜드는 `isHoneypotTripped()` 로 fetch 전 자체 가드. rate-limit 은 Web3Forms 위임.

**상태기계(아일랜드)**:
```
idle ─제출─▶ submitting (버튼 disabled, '보내는 중…', aria-busy)
              ├─성공─▶ success (폼 자리에 '제보 고마워요 🎸' + [닫기][또 제보])
              └─실패─▶ error   (인라인 배너, 입력값 보존, 재시도 가능)
```
- 에러 처리(전 레벨): 네트워크 실패·`success:false`·키 부재 → 사용자 친화 한국어 메시지(삼킴 금지, console.log 없음).
- 포커스: open→곡 포커스·트랩·ESC/백드롭 닫기, close→트리거 복귀, success→성공 제목 포커스.
- reduced-motion: dialog 등장·스피너 즉시 표시.
- a11y: `<dialog aria-labelledby>`, `<label>` 연결, `aria-live` 성공/에러 알림.

---

## 섹션 5 — 테스트 계획 & 엣지케이스

**Unit(Vitest)** `requestForm.ts`: validateRequest(빈 곡/아티스트·maxlen 초과), buildPayload(access_key·subject
포맷·replyto 조건부·honeypot·redirect 조건부), isHoneypotTripped, isEmail.
**Component(RTL)**: RequestForm(4필드·required·숨김필드·honeypot 숨김·native action/method), RequestDialogClient
(트리거→open, fetch mock 성공→success / 실패→error+값보존, ESC 닫기, 빈 제출 차단, 프리필).
**E2E(Playwright)**: ①no-JS(`javaScriptEnabled:false`) /request 채움→제출(web3forms route mock)→성공, 빈값 차단.
②JS dialog: 빈상태·푸터 트리거→open→제출 mock→인라인 성공·이동 0, ESC/백드롭 닫기·포커스 복귀, 프리필.
③비주얼 4bp(320/768/1024/1440) /request + dialog-open. ④axe=0. ⑤reduced-motion. **커버리지 ≥80%.**

**엣지케이스**: 키 부재(prod fail-fast / test placeholder) · SITE_URL 부재→redirect 생략(Web3Forms 기본 성공페이지)
· 제출 중 더블클릭(disabled) · 오프라인(error+재시도) · honeypot 발동(전송 안 함) · `<dialog>.showModal` 히스토리
오염 없음 · `/request/sent` 직접 방문 무해 · 프리필 레이스(라이브 input 값 직접 읽기, #3 선례).

---

## 비목표 (non-goals)

- 서버·DB·API 라우트(백엔드 0). 제출 내역 저장·관리자 UI 없음(이메일이 끝).
- CAPTCHA(honeypot 로 충분). 파일 첨부. 다국어. 제출 후 곡 자동 추가(사람이 tone-builder 로 처리).
- `NEXT_PUBLIC_SITE_URL`/`/request/sent` redirect 활성화(코드는 대비, 활성화는 도메인 확정 후).

---

## 열린 질문 → 처리

- (해소) 프리필=가볍게 / 요청자=이름·이메일 한 칸(이메일→replyto) / SITE_URL=추후(redirect 생략) / 키=사용자 직접.
- (PRD/구현 이월) Footer 의 그 외 내용(저작권·링크) — 최소(제보 링크 1개)로 시작, 필요 시 확장.
