# PRD — request-form (곡 제보 폼 → Web3Forms → Gmail)

- **Feature slug**: request-form
- **Brainstorm/설계**: docs/plans/2026-06-21-request-form-design.md
- **상태**: DRAFT

## 무엇 (What)
사이트 어디서든 누르는 "곡 제보" 진입점(빈상태 + 전역 `<footer>`)을 통해, 곡·아티스트·요청자·메모를
입력해 제보를 보낸다. JS 면 `<dialog>` 모달이 열려 **페이지 이동 없이** 인라인으로 제출·성공하고,
JS 가 없으면 같은 폼이 실제 `/request` 정적 페이지로 강등되어 네이티브 POST 로 동작한다. 제출은
**Web3Forms** 폼-투-이메일로 직접 가서 Gmail 로 도착한다. **백엔드·DB 0, 100% 정적.**

## 왜 (Why) / 누구를 위해
#1~#3 으로 패치·변주·검색이 갖춰져 "보여줄 가치"가 생겼다. 이제 GP-150 유저(나·밴드·방문자)가
라이브러리에 **없는 곡**을 발견했을 때, 막다른 길(0결과) 대신 한 번의 클릭으로 제보할 수 있어야 한다.
제보는 tone-builder 가 다음 패치를 만들 입력 큐가 된다. 서버를 두지 않기로 한 제약상(헌법) 제보는
이메일로 흐른다 — 폼이 Web3Forms 로 직접 가 백엔드 0 을 지킨다. 트랙2 의 마지막 사이클이자, 라이브러리를
"읽기 전용 전시"에서 "사용자가 키우는 컬렉션"으로 잇는 고리다.

## 수용 기준 (측정 가능 — 테스트로 검증)
- [ ] AC1: 곡·아티스트·요청자·메모 4개 입력 필드가 렌더되고, 곡·아티스트는 `required`, 전 필드 `maxlength`(곡/아티스트/요청자 100, 메모 1000)가 걸려 있다. (vitest RTL)
- [ ] AC2: `validateRequest()`가 곡 또는 아티스트가 비면 에러를, 둘 다 있으면 통과를 반환한다(순수함수, 길이 초과 포함). (vitest 단위)
- [ ] AC3: `buildPayload()`가 `access_key`·`subject`("곡 제보: <곡> / <아티스트>")·`from_name`·`botcheck` 를 포함하고, 요청자가 이메일 형식일 때만 `replyto` 를, SITE_URL 이 있을 때만 `redirect` 를 포함한다. (vitest 단위)
- [ ] AC4: **no-JS** 에서 song-index 빈상태/푸터 트리거는 실제 `/request` 페이지로 이동하고, 거기서 폼을 채워 제출하면 Web3Forms 엔드포인트로 네이티브 POST 된다(네트워크 mock 으로 요청 확인). 빈 필수값은 네이티브 검증이 차단한다. (Playwright `javaScriptEnabled:false`)
- [ ] AC5: **JS** 에서 트리거 클릭 시 페이지 이동 없이 `<dialog>` 모달이 열리고(`open` 상태), 곡 필드에 포커스가 간다. (Playwright)
- [ ] AC6: 모달에서 제출 시 fetch 로 Web3Forms 에 POST 하고(mock `{success:true}`), 폼 자리에 성공 메시지("제보 고마워요")가 인라인 표시되며 페이지 URL 은 변하지 않는다. (Playwright route mock)
- [ ] AC7: 제출 실패(mock 네트워크 오류 또는 `success:false`) 시 인라인 에러 메시지가 뜨고, 입력값이 보존되며 재시도가 가능하다(에러 삼킴 0, 무한 로딩 0). (Playwright)
- [ ] AC8: 모달은 ESC·백드롭 클릭·닫기 버튼으로 닫히고, 닫으면 포커스가 트리거로 복귀한다. (Playwright)
- [ ] AC9: 모달 안에서 Tab 이 모달 요소만 순회한다(포커스 트랩). axe 위반 0(다이얼로그 열린 상태 포함). (Playwright + axe)
- [ ] AC10: honeypot 필드(`botcheck`)가 시각적으로 숨겨지고(`aria-hidden`·`tabindex=-1`·off-screen) 사용자 탭 순회에서 제외된다. `isHoneypotTripped()`가 채워졌을 때 true 를 반환한다. (vitest + Playwright)
- [ ] AC11: 빈상태에서 검색어가 있으면 곡 필드가 그 값으로 가볍게 프리필된다(JS, 라이브 input 값 직접 읽기 — stale 0). no-JS `/request` 직접 방문은 빈 폼. (Playwright + vitest)
- [ ] AC12: 320/375/768/1024/1440 에서 /request 페이지와 dialog-open 상태 모두 오버플로 0, 터치 타깃 ≥44px. 비주얼 스냅샷 4 브레이크포인트. (Playwright)
- [ ] AC13: `prefers-reduced-motion` 에서 모달 등장·스피너가 모션 없이 즉시 표시된다. (Playwright)
- [ ] AC14: 빌드가 정적 유지 — `/request`·`/request/sent` 가 정적(`○ Static`/`●`), 런타임 서버·API 라우트 0, 모달 아일랜드는 PE 게이트로 격리. (next build 로그)
- [ ] AC15: Web3Forms 키가 prod 빌드에 부재하면 빌드가 fail-fast 한다. dev/test 는 placeholder 로 동작한다. (vitest + 빌드 가드)

## 비목표 (Non-goals)
- 서버·DB·API 라우트·제출 내역 저장·관리자 UI — 백엔드 0, 이메일이 끝(헌법).
- CAPTCHA — honeypot + Web3Forms 자체 방어로 충분(security 규칙: 가벼운 anti-abuse 우선).
- 파일 첨부·다국어·제출 후 곡 자동 추가(사람이 tone-builder 로 처리).
- `NEXT_PUBLIC_SITE_URL`/`/request/sent` redirect **활성화** — 코드는 조건부 대비, 활성화는 도메인 확정 후(추후). 지금은 no-JS 성공 시 Web3Forms 기본 성공페이지.
- rate limiting — 백엔드 없음, Web3Forms 위임.
- 곡 상세/변주/검색 — #1·#2·#3.

## 열린 질문
- Footer 의 제보 링크 외 내용(저작권·기타 링크) 범위 — TRD 에서 최소(제보 링크 1개)로 시작, 필요 시 확장.
- 모달 닫기 시 입력값 dirty 경고 — YAGNI 로 미채택(그냥 닫기). TRD 에서 재확인.
