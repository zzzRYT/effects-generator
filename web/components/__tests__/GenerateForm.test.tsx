import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { GenerateForm } from "@/components/generate/GenerateForm";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/components/generate/GenProgress", () => ({
  GenProgress: ({ jobId, stagedSlug, onReset }: { jobId: string; stagedSlug?: string; onReset(): void }) => (
    <div data-testid="progress">
      {jobId || stagedSlug}
      <button onClick={onReset}>진행 초기화</button>
    </div>
  ),
}));

const props = {
  guitars: [{ id: "g1", slug: "g250", brand: "Cort", model: "G250" }],
  processors: [{ id: "p1", slug: "gp150", brand: "Valeton", model: "GP-150" }],
};

function fillText() {
  fireEvent.change(screen.getByLabelText("아티스트"), { target: { value: "Oasis" } });
  fireEvent.change(screen.getByLabelText("곡 이름"), { target: { value: "Wonderwall" } });
}

async function submitResponse(body: unknown, status = 200) {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status }),
  );
  fireEvent.click(screen.getByRole("button", { name: "톤 생성" }));
}

describe("GenerateForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  test("switches guitar and processor between list and direct input", () => {
    render(<GenerateForm {...props} />);
    fireEvent.change(screen.getByLabelText("기타"), { target: { value: "__direct__" } });
    fireEvent.change(screen.getByLabelText("기타"), { target: { value: "Custom Guitar" } });
    fireEvent.click(screen.getAllByRole("button", { name: "목록으로" })[0]);
    expect(screen.getByLabelText("기타")).toHaveValue("G250");

    fireEvent.change(screen.getByLabelText("멀티이펙터"), { target: { value: "__direct__" } });
    fireEvent.change(screen.getByLabelText("멀티이펙터"), { target: { value: "Custom FX" } });
    fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
    expect(screen.getByLabelText("멀티이펙터")).toHaveValue("GP-150");
  });

  test("shows server field errors and generic API errors", async () => {
    render(<GenerateForm {...props} />);
    await submitResponse({ errors: { artist: "아티스트 오류", song: "곡 오류", guitar: "기타 오류", processor: "기기 오류" } }, 400);
    await screen.findByText("아티스트 오류");
    expect(screen.getByText("곡 오류")).toBeInTheDocument();
    expect(screen.getByText("기타 오류")).toBeInTheDocument();
    expect(screen.getByText("기기 오류")).toBeInTheDocument();

    await submitResponse({ error: "서버 오류" }, 500);
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("서버 오류");
  });

  test.each([
    [{ status: "queued", jobId: "job-1" }, "job-1"],
    [{ status: "ready", slug: "oasis-wonderwall" }, "oasis-wonderwall"],
  ])("renders progress for %o", async (body, marker) => {
    render(<GenerateForm {...props} />);
    fillText();
    await submitResponse(body);
    await waitFor(() => expect(screen.getByTestId("progress")).toHaveTextContent(marker));
    fireEvent.click(screen.getByRole("button", { name: "진행 초기화" }));
    expect(screen.getByRole("button", { name: "톤 생성" })).toBeEnabled();
  });

  test("renders unresolved gear with request link and returns", async () => {
    render(<GenerateForm {...props} />);
    await submitResponse({
      status: "unresolved",
      unresolved: [{ kind: "processor", query: "Unknown FX" }],
    });
    await screen.findByText("지원 준비중이에요");
    expect(screen.getByRole("link", { name: "기어 추가 요청하기" })).toHaveAttribute(
      "href",
      expect.stringContaining("processor%3A%20Unknown%20FX"),
    );
    fireEvent.click(screen.getByRole("button", { name: "돌아가기" }));
    expect(screen.getByRole("button", { name: "톤 생성" })).toBeEnabled();
  });

  test("shows unknown-response and network failures", async () => {
    render(<GenerateForm {...props} />);
    await submitResponse({ status: "queued" });
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("알 수 없는 응답");

    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(screen.getByRole("button", { name: "톤 생성" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("네트워크 오류"));
  });
});
