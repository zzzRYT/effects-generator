import { defineConfig, devices } from "@playwright/test";

// 비주얼 회귀 + E2E. 검증 루브릭(docs/verification-rubric.md)의 브레이크포인트 320/768/1024/1440.
// 정적 빌드 결과(production)를 대상으로 돈다 — dev 서버가 아니라 build+start.
// NOTE: 사이클 #1(signal-chain-view)에서 reduced-motion·a11y 프로젝트를 보강한다.
const BREAKPOINTS = [
  { name: "mobile-320", width: 320, height: 800 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1024", width: 1024, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
] as const;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: BREAKPOINTS.map((bp) => ({
    name: bp.name,
    use: {
      ...devices["Desktop Chrome"],
      viewport: { width: bp.width, height: bp.height },
    },
  })),
  webServer: {
    command: "pnpm run build && pnpm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // e2e 로그인(audio-tone-lab.spec)의 'e2e-admin'과 계약 — .env.local 실비밀번호에
    // 의존하던 암묵 전제를 제거해 스위트를 자기완결로 만든다(env 가 .env.local 보다 우선).
    env: { ...process.env, ADMIN_SECRET: "e2e-admin" },
  },
});
