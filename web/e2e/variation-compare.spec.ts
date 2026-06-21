import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// 사이클 #2 variation-compare — 변주 탭 전환. docs/prd/variation-compare.md AC1~AC11.
// 오아시스 = 3변주 → 탭 3개. (변주 1개 미렌더 AC8 은 VariationTabs.test 유닛에서 검증 — 단일변주 패치 없음.)
const OASIS = "/songs/g250-gp150/oasis-dont-look-back-in-anger";

test.describe("variation-compare — 탭 전환", () => {
  test("ui-1.8/AC1/AC2 — 탭 3개·클릭 시 패널 전환·콘솔 에러 0", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto(OASIS);
    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(3);

    // 기본: 첫 패널만 활성(나머지 숨김)
    await expect(page.locator("#vpanel-0")).toBeVisible();
    await expect(page.locator("#vpanel-1")).toBeHidden();

    // 둘째 탭 → 둘째 패널
    await tabs.nth(1).click();
    await expect(page.locator("#vpanel-1")).toBeVisible();
    await expect(page.locator("#vpanel-0")).toBeHidden();

    // 셋째 탭 → 셋째 패널
    await tabs.nth(2).click();
    await expect(page.locator("#vpanel-2")).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("AC3 — 탭 클릭이 ?v=N URL 에 반영(공유 가능)", async ({ page }) => {
    await page.goto(OASIS);
    await page.getByRole("tab").nth(1).click();
    await expect(page).toHaveURL(/\?v=2$/);
  });

  test("AC4 — ?v=2 딥링크 진입 시 2번 변주 활성", async ({ page }) => {
    await page.goto(`${OASIS}?v=2`);
    await expect(page.locator("#vpanel-1")).toBeVisible();
    await expect(page.locator("#vpanel-0")).toBeHidden();
    await expect(page.getByRole("tab").nth(1)).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("AC4 — ?v 무효(99)면 첫 변주 폴백(crash 0)", async ({ page }) => {
    await page.goto(`${OASIS}?v=99`);
    await expect(page.locator("#vpanel-0")).toBeVisible();
  });

  test("AC6 — 키보드 ←/→/Home/End roving(automatic activation)", async ({
    page,
  }) => {
    await page.goto(OASIS);
    await page.getByRole("tab").first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/\?v=2$/);
    await expect(page.locator("#vpanel-1")).toBeVisible();

    await page.keyboard.press("End");
    await expect(page).toHaveURL(/\?v=3$/);
    await expect(page.locator("#vpanel-2")).toBeVisible();

    await page.keyboard.press("Home");
    await expect(page).toHaveURL(/\?v=1$/);
    await expect(page.locator("#vpanel-0")).toBeVisible();
  });

  test("AC7 — axe 위반 0(탭 위젯)", async ({ page }) => {
    await page.goto(OASIS);
    // disabled 블록은 ui-1.3/data-contract §3 가 흐리게(opacity 0.30) 요구 → WCAG 1.4.3
    // inactive 면제. 대비 검사에서 제외(값은 풀텍스트 보존).
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .exclude('article[data-enabled="false"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("AC11 — reduced-motion 시 탭 전환 모션 즉시(≤0.1s)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(OASIS);
    const dur = await page
      .getByRole("tab")
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(["0s", "0.1s"]).toContain(dur);
  });
});

test.describe("variation-compare — 반응형 (AC9)", () => {
  test("탭바 가로 오버플로 0 + 터치 타깃 ≥44px", async ({ page }) => {
    await page.goto(OASIS);
    const overflow = await page.evaluate(
      () => document.body.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
    const h = await page
      .getByRole("tab")
      .first()
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThanOrEqual(44);
  });
});

test.describe("variation-compare — no-JS 폴백 (AC5)", () => {
  test.use({ javaScriptEnabled: false });

  test("JS 없으면 모든 변주 패널이 보인다(핵심 요구)", async ({ page }) => {
    await page.goto(OASIS);
    // html.js 미부착 → 숨김 CSS 미적용 → 3 패널 모두 visible
    await expect(page.locator("#vpanel-0")).toBeVisible();
    await expect(page.locator("#vpanel-1")).toBeVisible();
    await expect(page.locator("#vpanel-2")).toBeVisible();
  });
});
