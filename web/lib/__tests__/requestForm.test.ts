import { describe, it, expect } from "vitest";
import {
  WEB3FORMS_ENDPOINT,
  FIELD_NAMES,
  MAX_LEN,
  validateRequest,
  isEmail,
  isHoneypotTripped,
  buildPayload,
  type RequestInput,
} from "@/lib/requestForm";

function input(over: Partial<RequestInput> = {}): RequestInput {
  return { song: "Wonderwall", artist: "Oasis", requester: "", memo: "", ...over };
}

describe("validateRequest (AC2)", () => {
  it("곡·아티스트 모두 있으면 에러 없음", () => {
    expect(validateRequest(input())).toEqual({});
  });

  it("곡이 비면(또는 공백만) 곡 에러", () => {
    expect(validateRequest(input({ song: "" })).song).toBeTruthy();
    expect(validateRequest(input({ song: "   " })).song).toBeTruthy();
  });

  it("아티스트가 비면 아티스트 에러", () => {
    expect(validateRequest(input({ artist: "" })).artist).toBeTruthy();
  });

  it("곡·아티스트 둘 다 비면 둘 다 에러", () => {
    const e = validateRequest(input({ song: "", artist: "" }));
    expect(e.song).toBeTruthy();
    expect(e.artist).toBeTruthy();
  });

  it("길이 초과 시 해당 필드 에러", () => {
    expect(validateRequest(input({ song: "a".repeat(MAX_LEN.song + 1) })).song).toBeTruthy();
    expect(
      validateRequest(input({ artist: "a".repeat(MAX_LEN.artist + 1) })).artist,
    ).toBeTruthy();
    expect(
      validateRequest(input({ requester: "a".repeat(MAX_LEN.requester + 1) })).requester,
    ).toBeTruthy();
    expect(validateRequest(input({ memo: "a".repeat(MAX_LEN.memo + 1) })).memo).toBeTruthy();
  });

  it("경계값(정확히 max)은 통과", () => {
    expect(
      validateRequest(
        input({ song: "a".repeat(MAX_LEN.song), artist: "b".repeat(MAX_LEN.artist) }),
      ),
    ).toEqual({});
  });
});

describe("isEmail", () => {
  it.each(["a@b.co", "jin.star+1@goondori.com"])("이메일 형식 %s → true", (s) => {
    expect(isEmail(s)).toBe(true);
  });
  it.each(["", "오아시스", "a@b", "@b.co", "a b@c.co"])(
    "비이메일 %s → false",
    (s) => {
      expect(isEmail(s)).toBe(false);
    },
  );
});

describe("isHoneypotTripped (AC10)", () => {
  it("값이 차 있으면(봇) true", () => {
    expect(isHoneypotTripped("on")).toBe(true);
    expect(isHoneypotTripped(true)).toBe(true);
    expect(isHoneypotTripped("anything")).toBe(true);
  });
  it("비었으면(사람) false", () => {
    expect(isHoneypotTripped("")).toBe(false);
    expect(isHoneypotTripped("   ")).toBe(false);
    expect(isHoneypotTripped(null)).toBe(false);
    expect(isHoneypotTripped(undefined)).toBe(false);
    expect(isHoneypotTripped(false)).toBe(false);
  });
});

describe("buildPayload (AC3)", () => {
  const KEY = "test-key-123";

  it("필수 Web3Forms 필드 + 동적 subject 포함", () => {
    const p = buildPayload(input({ song: "Live Forever", artist: "Oasis" }), KEY);
    expect(p.access_key).toBe(KEY);
    expect(p.subject).toBe("곡 제보: Live Forever / Oasis");
    expect(p.from_name).toBeTruthy();
    expect(p[FIELD_NAMES.song]).toBe("Live Forever");
    expect(p[FIELD_NAMES.artist]).toBe("Oasis");
  });

  it("요청자·메모는 값이 있을 때만 포함", () => {
    const empty = buildPayload(input(), KEY);
    expect(empty[FIELD_NAMES.requester]).toBeUndefined();
    expect(empty[FIELD_NAMES.memo]).toBeUndefined();

    const full = buildPayload(input({ requester: "진", memo: "어쿠스틱 버전" }), KEY);
    expect(full[FIELD_NAMES.requester]).toBe("진");
    expect(full[FIELD_NAMES.memo]).toBe("어쿠스틱 버전");
  });

  it("요청자가 이메일이면 replyto 매핑, 아니면 생략", () => {
    expect(buildPayload(input({ requester: "jin@goondori.com" }), KEY).replyto).toBe(
      "jin@goondori.com",
    );
    expect(buildPayload(input({ requester: "진" }), KEY).replyto).toBeUndefined();
  });

  it("siteUrl 없으면 redirect 생략, 있으면 /request/sent (중복 슬래시 정리)", () => {
    expect(buildPayload(input(), KEY).redirect).toBeUndefined();
    expect(buildPayload(input(), KEY, "https://x.app").redirect).toBe(
      "https://x.app/request/sent",
    );
    expect(buildPayload(input(), KEY, "https://x.app/").redirect).toBe(
      "https://x.app/request/sent",
    );
  });

  it("값을 trim 해서 전송", () => {
    const p = buildPayload(input({ song: "  Slide Away  ", artist: " Oasis " }), KEY);
    expect(p[FIELD_NAMES.song]).toBe("Slide Away");
    expect(p[FIELD_NAMES.artist]).toBe("Oasis");
  });
});

describe("상수", () => {
  it("엔드포인트는 Web3Forms", () => {
    expect(WEB3FORMS_ENDPOINT).toBe("https://api.web3forms.com/submit");
  });
});
