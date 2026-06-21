import { describe, it, expect } from "vitest";
import { renderKnob } from "../renderKnob";
import type { Knob } from "../types";

// docs/data-contract-ui.md §2 표기 규칙의 권위 테스트.
describe("renderKnob — 단위 있는 노브", () => {
  it("ms 단위는 값에 공백 없이 붙인다", () => {
    expect(renderKnob({ name: "Time", value: 640, unit: "ms" })).toBe(
      "Time: 640ms",
    );
  });

  it("% 단위", () => {
    expect(renderKnob({ name: "Feedback", value: 15, unit: "%" })).toBe(
      "Feedback: 15%",
    );
  });

  it("s 단위 + 소수", () => {
    expect(renderKnob({ name: "Decay", value: 0.8, unit: "s" })).toBe(
      "Decay: 0.8s",
    );
  });
});

describe("renderKnob — 단위 없는 노브 (스케일 병기)", () => {
  it("scale 미지정이면 기본 0–10 (en dash)", () => {
    expect(renderKnob({ name: "Gain", value: 5.5 })).toBe("Gain: 5.5 (0–10)");
  });

  it("scale 0-10 명시", () => {
    expect(renderKnob({ name: "Gain", value: 7, scale: "0-10" })).toBe(
      "Gain: 7 (0–10)",
    );
  });

  it("scale 0-100", () => {
    expect(renderKnob({ name: "Level", value: 55, scale: "0-100" })).toBe(
      "Level: 55 (0–100)",
    );
  });
});

describe("renderKnob — 값 보존 (data-2.10)", () => {
  it("소수 자릿수를 반올림/절삭 없이 유지", () => {
    expect(renderKnob({ name: "Mid", value: 5.5 })).toContain("5.5");
    expect(renderKnob({ name: "X", value: 0.8, unit: "s" })).toContain("0.8");
  });

  it("정수는 정수로", () => {
    expect(renderKnob({ name: "Bass", value: 3 })).toBe("Bass: 3 (0–10)");
  });

  it("괄호 앞 공백, en dash 사용 (하이픈 아님)", () => {
    const out = renderKnob({ name: "G", value: 1 });
    expect(out).toMatch(/ \(0–10\)$/); // U+2013
    expect(out).not.toContain("(0-10)"); // ASCII hyphen 금지
  });

  it("단위와 값 사이 공백 없음", () => {
    expect(renderKnob({ name: "T", value: 120, unit: "ms" })).not.toContain(
      "120 ms",
    );
  });
});

describe("renderKnob — 타입 안전", () => {
  it("Knob 타입을 입력으로 받는다", () => {
    const k: Knob = { name: "Tone", value: 6.5, unit: "kHz" };
    expect(renderKnob(k)).toBe("Tone: 6.5kHz");
  });
});
