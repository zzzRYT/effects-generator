import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RequestDialogClient } from "@/components/request-form/RequestDialogClient";
import { SONG_SEARCH_ID } from "@/lib/songFilter";

// jsdom 은 <dialog> showModal/close 를 구현하지 않음 → 최소 스텁(open 토글 + close 이벤트).
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});

function mockFetchOnce(value: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    json: async () => value,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// 트리거 <a> + 프리필 소스 검색 input + dialog 아일랜드를 함께 렌더.
function setup(searchValue = "") {
  render(
    <>
      <input id={SONG_SEARCH_ID} defaultValue={searchValue} readOnly />
      <a href="/request" data-request-trigger="" data-testid="trigger">
        곡 제보
      </a>
      <RequestDialogClient />
    </>,
  );
  return screen.getByTestId("trigger");
}

function fill(song: string, artist: string) {
  fireEvent.change(screen.getByRole("textbox", { name: /^곡/ }), { target: { value: song } });
  fireEvent.change(screen.getByRole("textbox", { name: /^아티스트/ }), {
    target: { value: artist },
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("RequestDialog — 열기 & 프리필 (AC5, AC11)", () => {
  it("트리거 클릭 → dialog 열림(showModal) + 곡 필드 포커스", () => {
    const trigger = setup();
    fireEvent.click(trigger);
    const dialog = document.querySelector("dialog")!;
    expect(dialog.open).toBe(true);
    expect(screen.getByRole("textbox", { name: /^곡/ })).toHaveFocus();
  });

  it("라이브 검색값을 곡 필드에 프리필", () => {
    const trigger = setup("oasis");
    fireEvent.click(trigger);
    expect(screen.getByRole("textbox", { name: /^곡/ })).toHaveValue("oasis");
  });

  it("검색값 없으면 빈 곡 필드", () => {
    const trigger = setup("");
    fireEvent.click(trigger);
    expect(screen.getByRole("textbox", { name: /^곡/ })).toHaveValue("");
  });
});

describe("RequestDialog — 제출 (AC6, AC7)", () => {
  it("성공 → 인라인 성공 메시지", async () => {
    const fetchMock = mockFetchOnce({ success: true });
    const trigger = setup();
    fireEvent.click(trigger);
    fill("Live Forever", "Oasis");
    fireEvent.click(screen.getByRole("button", { name: "제보 보내기" }));
    expect(await screen.findByText(/제보 고마워요/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("실패(success:false) → 에러 배너 + 입력 보존 + 재시도 가능", async () => {
    mockFetchOnce({ success: false });
    const trigger = setup();
    fireEvent.click(trigger);
    fill("Slide Away", "Oasis");
    fireEvent.click(screen.getByRole("button", { name: "제보 보내기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/실패/);
    // 입력 보존 + 폼 그대로(재시도)
    expect(screen.getByRole("textbox", { name: /^곡/ })).toHaveValue("Slide Away");
    expect(screen.getByRole("button", { name: "제보 보내기" })).toBeEnabled();
  });

  it("네트워크 오류(reject) → 에러 배너", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")));
    const trigger = setup();
    fireEvent.click(trigger);
    fill("Cigarettes & Alcohol", "Oasis");
    fireEvent.click(screen.getByRole("button", { name: "제보 보내기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/네트워크/);
  });

  it("곡·아티스트 비면 fetch 안 함(검증 차단) + 인라인 에러", () => {
    const fetchMock = mockFetchOnce({ success: true });
    const trigger = setup();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "제보 보내기" }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: /^곡/ })).toHaveAttribute("aria-invalid", "true");
  });

  it("honeypot 채워지면 전송 안 하고 조용히 성공 처리", async () => {
    const fetchMock = mockFetchOnce({ success: true });
    const trigger = setup();
    fireEvent.click(trigger);
    fill("Whatever", "Oasis");
    // 봇이 honeypot 체크
    const hp = document.querySelector<HTMLInputElement>('[name="botcheck"]')!;
    fireEvent.click(hp);
    fireEvent.click(screen.getByRole("button", { name: "제보 보내기" }));
    await waitFor(() => expect(screen.getByText(/제보 고마워요/)).toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("RequestDialog — 닫기 (AC8)", () => {
  it("닫기 버튼 → dialog.close + 트리거로 포커스 복귀", () => {
    const trigger = setup();
    fireEvent.click(trigger);
    const dialog = document.querySelector("dialog")!;
    expect(dialog.open).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(dialog.open).toBe(false);
    expect(trigger).toHaveFocus();
  });

  it("백드롭(패널 바깥=dialog 자신) 클릭 → 닫기", () => {
    const trigger = setup();
    fireEvent.click(trigger);
    const dialog = document.querySelector("dialog")!;
    fireEvent.click(dialog); // target === dialog (패널 바깥)
    expect(dialog.open).toBe(false);
  });
});
