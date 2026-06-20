import { describe, it, expect } from "vitest";

// 하네스 배선 검증용 스모크 테스트. 사이클 #0 의 실제 파서 테스트가 들어오면 제거 가능.
describe("harness smoke", () => {
  it("vitest + jsdom 환경이 동작한다", () => {
    expect(typeof window).toBe("object");
    expect(1 + 1).toBe(2);
  });
});
