import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// 사이클 #4 request-form — 곡 제보 폼(dialog + /request 강등). docs/prd/request-form.md AC4~AC15.
// Web3Forms 엔드포인트는 라우트 mock 으로 가로채(실제 전송 0).
const WEB3FORMS = /api\.web3forms\.com\/submit/;

async function mockWeb3Forms(
  page: import("@playwright/test").Page,
  body: object = { success: true, message: "ok" },
  status = 200,
) {
  await page.route(WEB3FORMS, (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    }),
  );
}

test.describe("request-form — dialog (JS)", () => {
  test("AC5 — 푸터 트리거 클릭 → dialog 열림 + 곡 필드 포커스, 이동 없음", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "곡 제보하기" }).click();
    const dialog = page.locator("#request-dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("textbox", { name: /^곡/ })).toBeFocused();
    await expect(page).toHaveURL(/\/$/); // 페이지 이동 0
  });

  test("AC11 — 빈상태 트리거가 검색어를 곡 필드에 프리필", async ({ page }) => {
    await page.goto("/?q=zzzznomatch");
    const empty = page.locator("#song-empty");
    await expect(empty).toBeVisible();
    await empty.getByRole("link", { name: /제보하기/ }).click();
    await expect(page.locator("#request-dialog")).toBeVisible();
    await expect(page.getByRole("textbox", { name: /^곡/ })).toHaveValue(
      "zzzznomatch",
    );
  });

  test("AC6 — 제출 성공 → 인라인 성공 메시지, URL 불변", async ({ page }) => {
    await mockWeb3Forms(page);
    await page.goto("/");
    await page.getByRole("link", { name: "곡 제보하기" }).click();
    await page.getByRole("textbox", { name: /^곡/ }).fill("Live Forever");
    await page.getByRole("textbox", { name: /^아티스트/ }).fill("Oasis");
    const [request] = await Promise.all([
      page.waitForRequest(WEB3FORMS),
      page.getByRole("button", { name: "제보 보내기" }).click(),
    ]);
    // payload 검증 — 동적 subject + 필드
    const payload = JSON.parse(request.postData() ?? "{}");
    expect(payload.subject).toContain("Live Forever");
    expect(payload["곡"]).toBe("Live Forever");
    await expect(page.getByText(/제보 고마워요/)).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test("AC7 — 제출 실패 → 에러 배너 + 입력 보존 + 재시도", async ({ page }) => {
    await mockWeb3Forms(page, { success: false, message: "nope" }, 200);
    await page.goto("/");
    await page.getByRole("link", { name: "곡 제보하기" }).click();
    await page.getByRole("textbox", { name: /^곡/ }).fill("Slide Away");
    await page.getByRole("textbox", { name: /^아티스트/ }).fill("Oasis");
    await page.getByRole("button", { name: "제보 보내기" }).click();
    await expect(
      page.locator("#request-dialog").getByRole("alert"),
    ).toContainText(/실패/);
    await expect(page.getByRole("textbox", { name: /^곡/ })).toHaveValue(
      "Slide Away",
    );
    await expect(page.getByRole("button", { name: "제보 보내기" })).toBeEnabled();
  });

  test("AC8 — ESC 로 닫고 백드롭으로 닫기", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByRole("link", { name: "곡 제보하기" });
    await trigger.click();
    const dialog = page.locator("#request-dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    // 다시 열고 백드롭(좌상단 모서리) 클릭 → 닫힘
    await trigger.click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(dialog).toBeHidden();
  });

  test("AC10 — honeypot 은 접근성 트리에서 제외(checkbox role 0)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "곡 제보하기" }).click();
    await expect(page.locator("#request-dialog")).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
  });

  test("AC9 — dialog 열린 상태 axe 위반 0", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "곡 제보하기" }).click();
    await expect(page.locator("#request-dialog")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("AC9 — 모달 포커스 트랩: Tab 이 dialog 밖으로 새지 않음", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "곡 제보하기" }).click();
    await expect(page.locator("#request-dialog")).toBeVisible();
    // native modal <dialog> 은 배경을 inert 처리 → Tab 이 배경 인터랙티브 요소(푸터 링크·검색창·곡 링크)에
    // 절대 닿지 않는다. 마지막↔첫 요소 wrap 경계에서 focus 가 잠깐 <body>(비인터랙티브)에 머물 수 있는데,
    // 그건 containment 가 깨진 게 아니다(다음 Tab 이 dialog 로 복귀). 핵심: 배경 컨트롤에 포커스가 안 가는 것.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const contained = await page.evaluate(() => {
        const a = document.activeElement;
        const dlg = document.getElementById("request-dialog");
        return (dlg?.contains(a) ?? false) || a === document.body;
      });
      expect(contained).toBe(true);
    }
  });

  test("AC6 — 제출 중 더블서브밋 차단(요청 1회만)", async ({ page }) => {
    let count = 0;
    await page.route(WEB3FORMS, async (route) => {
      count += 1;
      await new Promise((r) => setTimeout(r, 400)); // in-flight 유지
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });
    await page.goto("/");
    await page.getByRole("link", { name: "곡 제보하기" }).click();
    await page.getByRole("textbox", { name: /^곡/ }).fill("Acquiesce");
    await page.getByRole("textbox", { name: /^아티스트/ }).fill("Oasis");
    await page.getByRole("button", { name: "제보 보내기" }).click();
    // 제출 중 버튼 비활성(1차 가드)
    await expect(page.getByRole("button", { name: "보내는 중…" })).toBeDisabled();
    await expect(page.getByText(/제보 고마워요/)).toBeVisible();
    expect(count).toBe(1);
  });

  test("AC13 — reduced-motion 시 제출 버튼 전환 즉시", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("link", { name: "곡 제보하기" }).click();
    const dur = await page
      .getByRole("button", { name: "제보 보내기" })
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(["0s", "0.1s"]).toContain(dur);
  });

  test("AC12 — dialog 비주얼 스냅샷", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "곡 제보하기" }).click();
    await expect(page.locator("#request-dialog")).toBeVisible();
    await expect(page).toHaveScreenshot("request-dialog.png", {
      animations: "disabled",
    });
  });
});

test.describe("request-form — /request 정적 페이지", () => {
  test("AC12 — /request 비주얼 스냅샷 + 제목/폼", async ({ page }) => {
    await page.goto("/request");
    await expect(page.getByRole("heading", { name: "곡 제보" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /^곡/ })).toBeVisible();
    await expect(page).toHaveScreenshot("request-page.png", {
      fullPage: true,
      animations: "disabled",
    });
  });

  test("AC9 — /request axe 위반 0", async ({ page }) => {
    await page.goto("/request");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("AC10 — 가로 오버플로 0 + 제출 버튼 ≥44px", async ({ page }) => {
    await page.goto("/request");
    const overflow = await page.evaluate(
      () => document.body.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
    const h = await page
      .getByRole("button", { name: "제보 보내기" })
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThanOrEqual(44);
  });
});

test.describe("request-form — no-JS 폴백 (AC4)", () => {
  test.use({ javaScriptEnabled: false });

  test("푸터 트리거가 /request 로 navigate + 네이티브 POST 가 Web3Forms 로", async ({
    page,
  }) => {
    await mockWeb3Forms(page);
    await page.goto("/");
    // no-JS: dialog 아일랜드 없음 → 트리거는 실제 링크로 이동
    await page.getByRole("link", { name: "곡 제보하기" }).click();
    await expect(page).toHaveURL(/\/request$/);
    await expect(page.getByRole("heading", { name: "곡 제보" })).toBeVisible();

    await page.getByRole("textbox", { name: /^곡/ }).fill("Wonderwall");
    await page.getByRole("textbox", { name: /^아티스트/ }).fill("Oasis");
    const [request] = await Promise.all([
      page.waitForRequest(WEB3FORMS),
      page.getByRole("button", { name: "제보 보내기" }).click(),
    ]);
    expect(request.method()).toBe("POST");
    const post = request.postData() ?? "";
    expect(post).toContain("Wonderwall");
    expect(post).toContain("access_key");
  });

  test("곡·아티스트는 required(네이티브 검증)", async ({ page }) => {
    await page.goto("/request");
    await expect(page.getByRole("textbox", { name: /^곡/ })).toHaveAttribute(
      "required",
      "",
    );
    await expect(page.getByRole("textbox", { name: /^아티스트/ })).toHaveAttribute(
      "required",
      "",
    );
  });
});
