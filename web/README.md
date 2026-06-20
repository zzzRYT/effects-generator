# web — GP-150 톤 뷰어 (소비 레이어)

`patches/` · `models/` · `rigs/` 의 마크다운을 **빌드 타임에 타입 상수로 구워** GP-150 기계 화면처럼 시각화하는 정적 Next.js 앱. **읽기 전용.** DB·백엔드 없음.

> 진실의 원천(SoT)은 md다. 톤 수정 = md 고치고 재빌드. 이 앱은 md를 편집하지 않는다.
> 프로젝트 헌법: 루트 `../CLAUDE.md`. 데이터 계약: `../docs/parser-contract.md`. UI 렌더 계약: `../docs/data-contract-ui.md`.

## 스택

- **Next.js 16 (App Router, TypeScript)** — `src/` 없음, `lib/`·`components/`·`app/` 가 루트.
  - ⚠️ Next 16 은 학습 데이터보다 최신. 앱 코드 쓰기 전 `node_modules/next/dist/docs/01-app/` 를 확인할 것 (`AGENTS.md` 참고).
- **CSS Modules + 디자인 토큰** (Tailwind 미사용). 블록 타입별 색은 `:root` 커스텀 프로퍼티.
- **빌드 타임 md 파서** — `scripts/gen-patches.ts` → `lib/patches.generated.ts` (gitignore, 빌드 산출물).

## 명령어

| 명령 | 역할 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | `gen:patches`(md→상수) → `next build` |
| `npm run gen:patches` | 패치 md 파싱 → `lib/patches.generated.ts` (사이클 #0 에서 구현) |
| `npm run lint` | ESLint `--fix` |
| `npm run typecheck` | **tsgo**(TS7 preview) — 루프 게이트(빠름) |
| `npm run typecheck:full` | **tsc** — 커밋 직전 풀 검증 |
| `npm test` | Vitest 1회 실행(유닛/컴포넌트) |
| `npm run test:watch` | Vitest watch (TDD 루프) |
| `npm run test:cov` | Vitest + 커버리지(임계 80%) — QA 게이트 |
| `npm run test:visual` | Playwright 비주얼/E2E (320/768/1024/1440) |

## 게이트 (매 편집 후)

`lint` + `typecheck`(tsgo) 가 green 이어야 다음 단계로 간다. 커밋 직전 `typecheck:full`(tsc) 로 풀 검증.
전체 루프 절차는 `../docs/web-harness.md`, QA 기준은 `../docs/verification-rubric.md`.

## 디렉터리 (계획)

```
web/
  app/            # App Router 페이지 (곡 목록, 곡 상세, 제보)
  components/     # feature 폴더 단위 (signal-chain/, block/, …) + *.module.css
  lib/            # 순수 로직: types.ts, parser/, patches.generated.ts(생성물)
  scripts/        # gen-patches.ts (빌드 타임 파서 진입점)
  e2e/            # Playwright 스펙
  tests/          # Vitest 공용/스모크
```
