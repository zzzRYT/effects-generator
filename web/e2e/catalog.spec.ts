import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// 동적 카탈로그(피벗 Phase 3) — 기능 + a11y(axe) + 반응형. 픽셀 스냅샷은 동적 데이터라 미사용.
// 안정 시드(Oasis)로 상세를 검증한다. 카탈로그는 생성으로 계속 늘어 정확 카운트 대신 ≥ 단언.
const OASIS_KEY = "g250-gp150/oasis-dont-look-back-in-anger";
const OASIS_DETAIL = "/songs/oasis-dont-look-back-in-anger";

test.describe("홈 — 생성 폼", () => {
  test("히어로 제목 + 아티스트/곡 입력 + 생성 버튼", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    // ID 로 특정 — 레이아웃의 (숨김) 제보 다이얼로그에도 "아티스트" 필드가 있어 라벨은 충돌.
    await expect(page.locator("#gen-artist")).toBeVisible();
    await expect(page.locator("#gen-song")).toBeVisible();
    await expect(page.getByRole("button", { name: "톤 생성" })).toBeVisible();
  });

  test("빈 제출 → 필드 에러(서버 검증)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "톤 생성" }).click();
    await expect(page.getByText("아티스트를 입력하세요")).toBeVisible();
    await expect(page.getByText("곡 이름을 입력하세요")).toBeVisible();
  });

  test("허니팟은 화면 밖 + 접근성 트리 제외", async ({ page }) => {
    await page.goto("/");
    // 생성 폼 한정(제보 폼에도 botcheck 허니팟이 있어 폼 스코프 필요).
    const honeypot = page.locator('form:has(#gen-artist) input[name="botcheck"]');
    await expect(honeypot).toHaveAttribute("aria-hidden", "true");
    const box = await honeypot.boundingBox();
    // left:-9999px → 뷰포트 밖
    expect(box === null || box.x < 0).toBe(true);
  });

  test("axe 위반 0", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("가로 오버플로 0 + 생성 버튼 ≥44px", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.body.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
    const h = await page
      .getByRole("button", { name: "톤 생성" })
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThanOrEqual(44);
  });
});

test.describe("톤 리스트 — /tones", () => {
  test("시드 곡들이 렌더(≥7) + Oasis 존재", async ({ page }) => {
    await page.goto("/tones");
    await expect(page.locator("#song-list [data-key]")).not.toHaveCount(0);
    const count = await page.locator("#song-list [data-key]").count();
    expect(count).toBeGreaterThanOrEqual(7);
    await expect(page.locator(`[data-key="${OASIS_KEY}"]`)).toBeVisible();
  });

  test("검색이 행을 필터", async ({ page }) => {
    await page.goto("/tones");
    await page.getByRole("searchbox", { name: "곡 검색" }).fill("oasis");
    await expect(page.locator(`[data-key="${OASIS_KEY}"]`)).toBeVisible();
    // 다른 곡(muse)은 숨김
    const muse = page.locator('[data-search*="muse"]');
    if ((await muse.count()) > 0) await expect(muse.first()).toBeHidden();
  });

  test("Oasis 행 링크가 /songs/[slug] 로", async ({ page }) => {
    await page.goto("/tones");
    const link = page.locator(`[data-key="${OASIS_KEY}"] a`);
    await expect(link).toHaveAttribute("href", OASIS_DETAIL);
  });

  test("axe 위반 0", async ({ page }) => {
    await page.goto("/tones");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("곡 상세 — /songs/[slug] (Oasis 시드)", () => {
  test("헤더 + 시그널 체인 + 변주 렌더", async ({ page }) => {
    await page.goto(OASIS_DETAIL);
    await expect(page.locator("h1")).toContainText("Don't Look Back");
    const variations = page.locator('article[role="tabpanel"]');
    await expect(variations).toHaveCount(3);
    const firstChain = page
      .getByRole("list", { name: /시그널 체인/ })
      .first()
      .locator("> li");
    await expect(firstChain).not.toHaveCount(0);
  });

  test("없는 slug → 404", async ({ page }) => {
    const res = await page.goto("/songs/zzz-does-not-exist");
    expect(res?.status()).toBe(404);
  });

  test("axe 위반 0(비활성 블록 제외)", async ({ page }) => {
    await page.goto(OASIS_DETAIL);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .exclude('article[data-enabled="false"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
