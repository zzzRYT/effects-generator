// jest-dom 매처(toBeInTheDocument 등)를 Vitest expect 에 연결.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// globals:false 라서 testing-library 자동 cleanup 이 등록되지 않는다 → 수동 등록.
afterEach(() => {
  cleanup();
});
