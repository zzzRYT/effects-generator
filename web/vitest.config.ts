import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// 유닛/컴포넌트 테스트 환경. 비주얼·E2E는 Playwright(playwright.config.ts)가 담당.
// tsconfig 의 "@/*" → 프로젝트 루트 별칭을 Vitest 에도 동일하게 맞춘다.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e/**"],
    coverage: {
      // 빌드 스크립트(scripts/)와 페이지(app/)는 E2E/빌드로 검증.
      // 순수 로직(lib/)과 렌더(components/)만 유닛 커버리지 대상.
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**", "components/**"],
      exclude: [
        "**/__tests__/**",
        "**/*.test.{ts,tsx}",
        "**/__fixtures__/**",
        "lib/types.ts", // 순수 타입 — 런타임 코드 없음
        "lib/patches.generated.ts", // 빌드 산출물
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
