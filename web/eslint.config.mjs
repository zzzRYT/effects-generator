import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 빌드/테스트 아티팩트 + 생성물
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "lib/patches.generated.ts",
  ]),
  {
    rules: {
      // 이슈: ESLint/@next 플러그인이 [id] 같은 동적 라우트의 정규표현식을 잘못 파싱
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;
