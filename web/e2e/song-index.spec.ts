import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// 사이클 #3 song-index — 홈 곡 목록 + 검색 + rig 칩. docs/prd/song-index.md AC1~AC11.
// 실데이터: 7곡(g250-gp150 6 + xt-450-gp150 1=yb). genre 는 검색 대상에 포함.
const OASIS_KEY = "g250-gp150/oasis-dont-look-back-in-anger";
const YB_XT_KEY = "xt-450-gp150/yb-white-whale";

test.describe("song-index — 목록 & 검색", () => {
  test("AC1/AC7 — 전체 목록 + 곡 수 count", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("#song-list [data-key]")).toHaveCount(7);
    await expect(page.locator("#song-count")).toHaveText("7곡");
  });

  test("AC2 — 검색이 행을 필터하고 ?q= 에 반영", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "곡 검색" }).fill("oasis");
    await expect(page).toHaveURL(/\?q=oasis$/);
    await expect(page.locator(`[data-key="${OASIS_KEY}"]`)).toBeVisible();
    await expect(page.locator("#song-count")).toHaveText("1곡");
  });

  test("AC2 — genre 키워드도 검색됨(검색 대상에 genre 포함)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "곡 검색" }).fill("브릿팝");
    await expect(page.locator(`[data-key="${OASIS_KEY}"]`)).toBeVisible();
    await expect(page.locator("#song-count")).toHaveText("1곡");
  });

  test("AC3/AC6 — rig 칩이 필터 + aria-pressed", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "xt-450-gp150" }).click();
    await expect(page).toHaveURL(/\?rig=xt-450-gp150$/);
    await expect(page.getByRole("button", { name: "xt-450-gp150" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator(`[data-key="${YB_XT_KEY}"]`)).toBeVisible();
    await expect(page.locator(`[data-key="${OASIS_KEY}"]`)).toBeHidden();
  });

  test("AC3 — 검색 + rig AND 결합", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "곡 검색" }).fill("oasis");
    await page.getByRole("button", { name: "g250-gp150" }).click();
    await expect(page.locator(`[data-key="${OASIS_KEY}"]`)).toBeVisible();
    // oasis 는 g250 → xt 로 바꾸면 0
    await page.getByRole("button", { name: "xt-450-gp150" }).click();
    await expect(page.locator("#song-count")).toHaveText("0곡");
  });

  test("AC3 — 타이핑 직후 칩 클릭에도 검색어 보존(레이스 회귀 가드)", async ({
    page,
  }) => {
    await page.goto("/");
    // 타이핑 → 곧바로 칩 클릭. onRig 가 라이브 입력값을 읽으므로 q 가 누락되면 안 됨.
    await page.getByRole("searchbox", { name: "곡 검색" }).fill("oasis");
    await page.getByRole("button", { name: "g250-gp150" }).click();
    // URL 에 q·rig 가 둘 다 살아있어야 함(이전 버그: 칩 클릭이 q 를 떨어뜨림)
    await expect(page).toHaveURL(/\?q=oasis&rig=g250-gp150$/);
    await expect(page.locator("#song-count")).toHaveText("1곡");
  });

  test("AC4 — ?q= 딥링크 진입 시 필터 상태로 열림", async ({ page }) => {
    await page.goto("/?q=muse");
    await expect(page.getByRole("searchbox", { name: "곡 검색" })).toHaveValue(
      "muse",
    );
    await expect(page.locator("#song-count")).toHaveText("1곡");
    await expect(page.locator(`[data-key="${OASIS_KEY}"]`)).toBeHidden();
  });

  test("AC5 — 0 결과 시 빈상태 + 초기화 링크 (edge-3.6)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "곡 검색" }).fill("zzzznomatch");
    await expect(page.locator("#song-count")).toHaveText("0곡");
    const empty = page.locator("#song-empty");
    await expect(empty).toBeVisible();
    await expect(empty).toContainText("검색 결과가 없습니다");
    await empty.getByRole("link", { name: "필터 초기화" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("#song-count")).toHaveText("7곡");
  });

  test("AC9 — axe 위반 0", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("AC10 — reduced-motion 시 칩 전환 즉시(≤0.1s)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const dur = await page
      .getByRole("button", { name: "전체" })
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(["0s", "0.1s"]).toContain(dur);
  });

  test("AC10 — 가로 오버플로 0 + 칩 터치 ≥44px", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.body.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
    const h = await page
      .getByRole("button", { name: "전체" })
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThanOrEqual(44);
  });

  test("비주얼 회귀 — 홈 목록 스냅샷", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveScreenshot("song-index.png", {
      fullPage: true,
      animations: "disabled",
    });
  });
});

test.describe("song-index — no-JS 폴백 (AC8)", () => {
  test.use({ javaScriptEnabled: false });

  test("JS 없으면 전체 목록만(필터 컨트롤 부재)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#song-list [data-key]")).toHaveCount(7);
    // 모든 행 visible
    await expect(page.locator(`[data-key="${OASIS_KEY}"]`)).toBeVisible();
    await expect(page.locator(`[data-key="${YB_XT_KEY}"]`)).toBeVisible();
    // 필터 컨트롤(검색창)은 아일랜드라 no-JS 엔 미렌더
    await expect(page.getByRole("searchbox", { name: "곡 검색" })).toHaveCount(0);
  });
});
