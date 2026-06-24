import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { GuitarSetting as GuitarSettingData } from "@/lib/types";
import { GuitarSetting } from "@/components/song-detail/GuitarSetting";

describe("GuitarSetting", () => {
  it("셀렉터(위치+라벨)·볼륨·톤·메모를 렌더한다", () => {
    const g: GuitarSettingData = {
      selector: 1,
      selectorLabel: "브릿지 험버커",
      volume: 8,
      tone: 7,
      coilSplit: false,
      note: "벌스 볼륨 6~7 롤백",
    };
    render(<GuitarSetting guitar={g} />);
    expect(screen.getByRole("region", { name: "기타 세팅" })).toBeInTheDocument();
    expect(screen.getByText("셀렉터")).toBeInTheDocument();
    expect(screen.getByText("브릿지 험버커")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // 위치 칩
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("벌스 볼륨 6~7 롤백")).toBeInTheDocument();
  });

  it("coilSplit=true 일 때만 코일 스플릿 행을 표시", () => {
    render(<GuitarSetting guitar={{ coilSplit: true }} />);
    expect(screen.getByText("코일 스플릿")).toBeInTheDocument();
    expect(screen.getByText("걸기")).toBeInTheDocument();
  });

  it("coilSplit=false 면 코일 스플릿 행을 숨긴다", () => {
    render(<GuitarSetting guitar={{ selector: 5, selectorLabel: "넥", coilSplit: false }} />);
    expect(screen.queryByText("코일 스플릿")).toBeNull();
  });

  it("selectorLabel 이 없으면 위치 숫자로 폴백", () => {
    render(<GuitarSetting guitar={{ selector: 3 }} />);
    expect(screen.getByText("위치 3")).toBeInTheDocument();
  });

  it("guitar 가 없으면 null", () => {
    const { container } = render(<GuitarSetting />);
    expect(container.firstChild).toBeNull();
  });

  it("표시할 필드가 하나도 없으면 null", () => {
    const { container } = render(<GuitarSetting guitar={{ coilSplit: false }} />);
    expect(container.firstChild).toBeNull();
  });
});
