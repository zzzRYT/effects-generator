// Cort G250(HSS) 5-way 셀렉터 맵 — selectorLabel 런타임 파생용 상수.
// 출처: models/guitars/cort-g250.md (## 5-way 셀렉터). Vercel 동적 배포는 ../models 를 못 읽으므로
// 빌드타임 파서(guitarRegistry)의 파생을 런타임에서 쓰도록 이 상수로 박는다(단일 기타라 안전).
// 멀티 기타로 확장 시: processor/rig → 기타 모델별 맵 테이블로 일반화.

export const G250_SELECTOR_MAP: ReadonlyMap<number, string> = new Map([
  [1, "브릿지 험버커"],
  [2, "브릿지 + 미들"],
  [3, "미들"],
  [4, "미들 + 넥"],
  [5, "넥"],
]);

/** G250 브릿지 험버커 코일 스플릿 지원(cort-g250.md 명시). */
export const G250_COIL_SPLIT_SUPPORTED = true;

/** processor_slug → 기본 rig slug. DB는 processor 중심이라 rig 는 여기서 파생. */
export const PROCESSOR_RIG: Readonly<Record<string, string>> = {
  gp150: "g250-gp150",
};
