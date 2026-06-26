import { describe, expect, test } from "vitest";
import { normArtist, normTitle } from "../normalize";

// DB songs.artist_norm/title_norm 과 동일 규칙(lower+trim)이어야 캐시 조회가 정확.
describe("normalize", () => {
  test("lower + trim", () => {
    expect(normArtist("  Oasis ")).toBe("oasis");
    expect(normTitle("Don't Look Back in Anger")).toBe("don't look back in anger");
  });

  test("실DB 값과 일치", () => {
    // introspect: artist_norm="oasis", title_norm="don't look back in anger"
    expect(normArtist("Oasis")).toBe("oasis");
    expect(normTitle("Don't Look Back in Anger")).toBe("don't look back in anger");
  });
});
