import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

describe("AdminLoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  test("posts the password and replaces with the safe next path", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
    render(<AdminLoginForm nextPath="/lab/audio-tone" />);
    fireEvent.change(screen.getByLabelText("관리자 비밀번호"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "실험실 들어가기" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/session",
        expect.objectContaining({ body: JSON.stringify({ password: "secret" }) }),
      ),
    );
    expect(navigation.replace).toHaveBeenCalledWith("/lab/audio-tone");
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });

  test("renders API and network failures and unlocks the button", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "비밀번호 오류" }), { status: 401 }),
    );
    const { rerender } = render(<AdminLoginForm nextPath="/lab/audio-tone" />);
    fireEvent.change(screen.getByLabelText("관리자 비밀번호"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "실험실 들어가기" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("비밀번호 오류");
    expect(screen.getByRole("button", { name: "실험실 들어가기" })).toBeEnabled();

    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    rerender(<AdminLoginForm nextPath="/lab/audio-tone" />);
    fireEvent.click(screen.getByRole("button", { name: "실험실 들어가기" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("네트워크 오류"),
    );
  });
});
