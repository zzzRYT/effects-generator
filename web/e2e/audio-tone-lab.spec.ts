import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const EXPERIMENTS = /\/api\/lab\/audio-tone\/experiments(?:\/exp-1(?:\/evaluation)?)?$/;

function projection(amp: string) {
  return {
    status: "projected",
    chain: [{ type: "AMP", model: amp, enabled: true, knobs: [] }],
    nullReason: null,
  };
}

async function mockYouTube(page: Page) {
  await page.addInitScript(() => {
    class Player {
      constructor(_element: HTMLElement, options: { events: { onReady(event: unknown): void } }) {
        queueMicrotask(() => options.events.onReady({ target: this }));
      }
      destroy() {}
      getCurrentTime() { return 0; }
      getDuration() { return 180; }
      pauseVideo() {}
      playVideo() {}
      seekTo() {}
    }
    Object.defineProperty(window, "YT", { value: { Player }, configurable: true });
  });
}

async function login(page: Page) {
  await page.goto("/lab/audio-tone");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("관리자 비밀번호").fill("e2e-admin");
  await page.getByRole("button", { name: "실험실 들어가기" }).click();
  await expect(page).toHaveURL(/\/lab\/audio-tone$/);
}

async function fillExperiment(page: Page) {
  const lab = page.locator("main");
  await lab.getByLabel("아티스트", { exact: true }).fill("Oasis");
  await lab.getByLabel("곡명", { exact: true }).fill("Wonderwall");
  await lab.getByLabel("YouTube URL", { exact: true }).fill("https://youtu.be/dQw4w9WgXcQ");
  await lab.getByRole("button", { name: "영상 불러오기" }).click();
  await expect(lab.getByTestId("youtube-player")).toBeVisible();
  await expect(lab.getByRole("slider", { name: "구간 선택" })).toHaveAttribute(
    "aria-valuetext",
    "00:00–00:20",
  );
}

test.beforeEach(async ({ page }) => {
  await mockYouTube(page);
});

test("admin login → drag a point on the timeline → anonymous evaluation → reveal → replay", async ({ page }) => {
  let pollCount = 0;
  await page.route(EXPERIMENTS, async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (method === "POST" && url.endsWith("/experiments")) {
      return route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ experimentId: "exp-1" }) });
    }
    if (method === "POST" && url.endsWith("/evaluation")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "exp-1",
          status: "evaluated",
          progress: {},
          variants: { A: projection("UK 800"), B: projection("US Deluxe") },
          reveal: { A: "enriched", B: "baseline" },
          preferredVariant: "enriched",
        }),
      });
    }
    pollCount += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        pollCount === 1
          ? { id: "exp-1", status: "analyzing", progress: { stage: "analyzing" } }
          : {
              id: "exp-1",
              status: "ready",
              progress: { stage: "ready" },
              variants: { A: projection("UK 800"), B: projection("US Deluxe") },
            },
      ),
    });
  });

  await login(page);
  await fillExperiment(page);

  const timeline = page.getByTestId("point-timeline");
  // 작은 뷰포트에선 타임라인이 폴드 아래라 마우스 좌표가 뷰포트 밖으로 떨어진다 — 스크롤 선행.
  await timeline.scrollIntoViewIfNeeded();
  const box = await timeline.boundingBox();
  if (!box) throw new Error("timeline not rendered");
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2);
  await page.mouse.up();
  const slider = page.getByRole("slider", { name: "구간 선택" });
  await expect(slider).not.toHaveAttribute("aria-valuetext", "00:00–00:20");

  await slider.focus();
  await page.keyboard.press("ArrowRight");
  const afterMove = await slider.getAttribute("aria-valuenow");
  await page.keyboard.press("Shift+ArrowRight");
  const afterShiftMove = await slider.getAttribute("aria-valuenow");
  expect(Number(afterShiftMove)).toBe(Number(afterMove) + 5_000);

  await page.getByRole("button", { name: "A/B 분석 시작" }).click();
  await expect(page.getByRole("status")).toContainText("분석 진행 중");
  await expect(page.getByRole("heading", { name: "익명 A/B 평가" })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText("UK 800")).toBeVisible();
  await expect(page.getByText("US Deluxe")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("baseline");
  await expect(page.locator("body")).not.toContainText("enriched");

  for (const label of ["A", "B"] as const) {
    for (const metric of ["논리적 정합성", "체인 타당성", "노브 실사용성"] as const) {
      await page.getByLabel(`${label} ${metric}`).selectOption("4");
    }
  }
  await page.getByRole("radio", { name: "A 선호" }).check();
  await page.getByRole("button", { name: "평가 제출" }).click();
  await expect(page.getByRole("heading", { name: "평가 결과" })).toBeVisible();
  await expect(page.getByText("A = enriched")).toBeVisible();

  const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);

  await page.getByRole("button", { name: "다른 구간 다시 보기" }).click();
  await expect(page.locator("main").getByLabel("아티스트", { exact: true })).toHaveValue("Oasis");
  await expect(page.getByTestId("point-timeline")).toBeVisible();
});

test("failed experiment can return to editing", async ({ page }) => {
  await page.route(EXPERIMENTS, async (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ experimentId: "exp-1" }) });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "exp-1", status: "failed", progress: {}, failureCode: "provider:request_failed" }),
    });
  });
  await login(page);
  await fillExperiment(page);
  await page.getByRole("button", { name: "A/B 분석 시작" }).click();
  await page.getByRole("button", { name: "다시 시도" }).click();
  await expect(page.locator("main").getByLabel("아티스트", { exact: true })).toBeEnabled();
});

test("editing lab has no serious accessibility violations", async ({ page }) => {
  await login(page);
  await fillExperiment(page);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(result.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
});
