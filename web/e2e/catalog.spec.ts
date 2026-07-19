import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// 동적 카탈로그(R4 tones 기반) — 기능 + a11y(axe) + 반응형. 픽셀 스냅샷은 동적 데이터라 미사용.
// 안정 시드(Oasis DLBIA, 5-role 적재)로 상세를 검증한다. 카운트·rig 는 라이브 데이터라 단언하지
// 않고, data-key 는 rig 유무와 무관하게 slug 접미로 매칭한다(2026-07-18 현행화).
const OASIS_ROW = '[data-key$="/oasis-dont-look-back-in-anger"]';
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
  // 카탈로그는 라이브 tones 기반이라 정확 카운트 단언은 데이터 정리·축적에 취약 —
  // 구조(목록 렌더)와 안정 시드(Oasis)만 단언한다(2026-07-18, 독푸딩 잔재 정리로 ≥7 폐기).
  test("카탈로그 목록 렌더 + Oasis 존재", async ({ page }) => {
    await page.goto("/tones");
    await expect(page.locator("#song-list [data-key]")).not.toHaveCount(0);
    await expect(page.locator(OASIS_ROW)).toBeVisible();
  });

  test("검색이 행을 필터", async ({ page }) => {
    await page.goto("/tones");
    await page.getByRole("searchbox", { name: "곡 검색" }).fill("oasis");
    await expect(page.locator(OASIS_ROW)).toBeVisible();
    // 다른 곡(radwimps)은 숨김
    const other = page.locator('[data-search*="radwimps"]');
    if ((await other.count()) > 0) await expect(other.first()).toBeHidden();
  });

  test("Oasis 행 링크가 /songs/[slug] 로", async ({ page }) => {
    await page.goto("/tones");
    const link = page.locator(`${OASIS_ROW} a`);
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
  test("헤더 + role 5탭 + 시그널 체인 렌더", async ({ page }) => {
    await page.goto(OASIS_DETAIL);
    await expect(page.locator("h1")).toContainText("Don't Look Back");
    // R4 RoleTabs: role 5종 탭 + 활성 패널 1개(한 번에 하나).
    await expect(page.getByRole("tab")).toHaveCount(5);
    await expect(page.getByRole("tabpanel")).toBeVisible();
    const chain = page
      .getByRole("list", { name: /시그널 체인/ })
      .first()
      .locator("> li");
    await expect(chain).not.toHaveCount(0);
  });

  test("없는 slug → 404", async ({ page }) => {
    const res = await page.goto("/songs/zzz-does-not-exist");
    expect(res?.status()).toBe(404);
  });

  test("axe 위반 0(비활성 블록 제외)", async ({ page }) => {
    await page.goto(OASIS_DETAIL);
    // RoleTabs 패널 fadeIn(150ms) 도중 axe 가 중간 opacity 로 대비를 측정하는 레이스 방지 —
    // 타임아웃이 아니라 실제 애니메이션 종료를 기다린다(결정적).
    await page.evaluate(() =>
      Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
    );
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .exclude('article[data-enabled="false"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
