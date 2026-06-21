import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RequestForm } from "@/components/request-form/RequestForm";
import { FIELD_NAMES, WEB3FORMS_ENDPOINT } from "@/lib/requestForm";

describe("RequestForm — 필드 & 마크업 (AC1, AC10)", () => {
  it("곡·아티스트·요청자·메모 4필드 렌더, 곡·아티스트 required", () => {
    render(<RequestForm mode="native" accessKey="k" />);
    expect(screen.getByLabelText(/^곡/)).toBeRequired();
    expect(screen.getByLabelText(/^아티스트/)).toBeRequired();
    expect(screen.getByLabelText(/요청자/)).not.toBeRequired();
    expect(screen.getByLabelText(/메모/)).toBeInTheDocument();
  });

  it("전 필드 maxlength 적용", () => {
    render(<RequestForm mode="native" accessKey="k" />);
    expect(screen.getByLabelText(/^곡/)).toHaveAttribute("maxlength", "100");
    expect(screen.getByLabelText(/메모/)).toHaveAttribute("maxlength", "1000");
  });

  it("honeypot 은 접근성 트리에서 제외(aria-hidden + tabindex=-1)", () => {
    const { container } = render(<RequestForm mode="native" accessKey="k" />);
    const hp = container.querySelector(`[name="${FIELD_NAMES.honeypot}"]`)!;
    expect(hp).toHaveAttribute("aria-hidden", "true");
    expect(hp).toHaveAttribute("tabindex", "-1");
    // 접근성 이름 기반 쿼리(체크박스)로는 안 잡힘
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});

describe("RequestForm — native 모드 (AC4)", () => {
  it("Web3Forms 로 POST action + 숨김 access_key 포함", () => {
    const { container } = render(<RequestForm mode="native" accessKey="my-key" />);
    const form = container.querySelector("form")!;
    expect(form).toHaveAttribute("action", WEB3FORMS_ENDPOINT);
    expect(form).toHaveAttribute("method", "POST");
    expect(container.querySelector('input[name="access_key"]')).toHaveValue("my-key");
    expect(container.querySelector('input[name="subject"]')).toBeInTheDocument();
  });

  it("native 는 noValidate 아님(브라우저 검증 사용)", () => {
    const { container } = render(<RequestForm mode="native" accessKey="k" />);
    expect(container.querySelector("form")!.noValidate).toBe(false);
  });
});

describe("RequestForm — island 모드", () => {
  it("action 없음 + noValidate + 숨김 access_key 미렌더(payload 는 fetch 가 구성)", () => {
    const { container } = render(<RequestForm mode="island" accessKey="k" />);
    const form = container.querySelector("form")!;
    expect(form).not.toHaveAttribute("action");
    expect(form.noValidate).toBe(true);
    expect(container.querySelector('input[name="access_key"]')).toBeNull();
  });

  it("defaultSong 으로 곡 필드 프리필", () => {
    render(<RequestForm mode="island" accessKey="k" defaultSong="Wonderwall" />);
    expect(screen.getByLabelText(/^곡/)).toHaveValue("Wonderwall");
  });

  it("submitting 이면 버튼 비활성 + aria-busy", () => {
    const { container } = render(
      <RequestForm mode="island" accessKey="k" submitting />,
    );
    expect(screen.getByRole("button", { name: "보내는 중…" })).toBeDisabled();
    expect(container.querySelector("form")).toHaveAttribute("aria-busy", "true");
  });

  it("errors 면 인라인 에러 + aria-invalid + aria-describedby 연결", () => {
    render(
      <RequestForm
        mode="island"
        accessKey="k"
        errors={{ song: "곡 이름을 입력하세요" }}
      />,
    );
    const song = screen.getByLabelText(/^곡/);
    expect(song).toHaveAttribute("aria-invalid", "true");
    const errId = song.getAttribute("aria-describedby")!;
    expect(document.getElementById(errId)).toHaveTextContent("곡 이름을 입력하세요");
  });

  it("formError 면 폼 레벨 alert 배너", () => {
    render(
      <RequestForm mode="island" accessKey="k" formError="네트워크 오류" />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("네트워크 오류");
  });
});
