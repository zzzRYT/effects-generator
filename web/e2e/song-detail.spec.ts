import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// 검증 루브릭(docs/verification-rubric.md) 기준의 비주얼·a11y·반응형 회귀.
// 오아시스 = 3변주 × (disabled 2 + footswitch 2 + switching) → 핵심 케이스 커버.
const OASIS = "/songs/g250-gp150/oasis-dont-look-back-in-anger";

test("홈이 곡 목록을 렌더한다", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByRole("link").first()).toBeVisible();
});

test("곡 상세 — 헤더와 시그널 체인이 순서대로 렌더된다 (ui-1.2)", async ({
  page,
}) => {
  await page.goto(OASIS);
  await expect(page.locator("h1")).toContainText("Don't Look Back");
  // 변주 3개 (탭 패널 — 숨김 포함 DOM 카운트)
  const variations = page.locator('article[role="tabpanel"]');
  await expect(variations).toHaveCount(3);
  // 첫 변주의 블록들이 좌→우(또는 위→아래) DOM 순서대로
  const firstChain = page
    .getByRole("list", { name: /시그널 체인/ })
    .first()
    .locator("> li");
  await expect(firstChain).toHaveCount(5);
});

test("노브가 data-contract §2 형식으로 렌더된다 (ui-1.6)", async ({ page }) => {
  await page.goto(OASIS);
  const body = await page.locator("body").innerText();
  // 단위 없는 노브: 'Name: 5.5 (0–10)' (en dash)
  expect(body).toMatch(/\d(\.\d+)?\s\(0–(10|100)\)/);
});

test("enabled=false 블록은 다중 신호로 비활성 표시 (ui-1.3, edge-3.11)", async ({
  page,
}) => {
  await page.goto(OASIS);
  const disabled = page.locator('article[data-enabled="false"]').first();
  await expect(disabled).toBeVisible();
  const opacity = await disabled.evaluate(
    (el) => Number.parseFloat(getComputedStyle(el).opacity),
  );
  expect(opacity).toBeLessThanOrEqual(0.4);
  const filter = await disabled.evaluate(
    (el) => getComputedStyle(el).filter,
  );
  expect(filter).toContain("grayscale");
  // 텍스트 상태 라벨(OFF) — 색맹/grayscale 에서도 식별
  await expect(disabled).toContainText(/OFF/);
  // 비활성이어도 노브 값은 보존(데이터 손실 0)
  await expect(disabled.locator("dd")).not.toHaveCount(0);
});

test("풋스위치 블록에 배지 + aria-label (ui-1.5, fs-4.9)", async ({ page }) => {
  await page.goto(OASIS);
  const fsBadge = page.getByLabel(/풋스위치로 토글/).first();
  await expect(fsBadge).toBeVisible();
  await expect(fsBadge).toContainText(/[AB]/);
});

test("스위칭 플랜이 분리된 섹션에 표시된다 (fs-4.6, fs-4.10)", async ({
  page,
}) => {
  await page.goto(OASIS);
  const plan = page
    .getByRole("region", { name: "스위칭 플랜" })
    .first();
  await expect(plan).toBeVisible();
  // 개수·모델 병기 '(N개: …)'
  await expect(plan).toContainText(/\(\d+개:/);
});

test("키보드 내비 — 링크 포커스 가능 (cross-5.2)", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(focused).toBe("A");
});

test("axe 접근성 위반 0 (cross-5.1, cross-5.3)", async ({ page }) => {
  await page.goto(OASIS);
  // 비활성(enabled=false) 블록은 data-contract §3·ui-1.3 이 opacity 0.30 으로 흐리게
  // 표시하라고 요구한다(=의도적 비활성 표현). WCAG 1.4.3 은 inactive UI 컴포넌트
  // 텍스트를 대비 요건에서 면제하므로, 대비 위반 검사에서 disabled 블록은 제외한다.
  // (값 자체는 풀텍스트로 보존되어 읽힌다 — 정보 손실 0.)
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .exclude('article[data-enabled="false"]')
    .analyze();
  expect(results.violations).toEqual([]);
});

test("비주얼 회귀 — 곡 상세 스냅샷", async ({ page }) => {
  await page.goto(OASIS);
  await expect(page).toHaveScreenshot("oasis-song-detail.png", {
    fullPage: true,
    animations: "disabled",
  });
});
