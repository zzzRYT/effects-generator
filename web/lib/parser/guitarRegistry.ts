import matter from "gray-matter";

// rig → 기타 모델의 셀렉터 맵을 빌드 타임에 읽는 순수 로더.
// 패치는 selector 숫자만 담고, parsePatch 가 이 레지스트리로 selectorLabel 을 파생한다.
// 입력 = rig/기타 md 내용, 출력 = 맵. 순수 함수(같은 입력 → 같은 출력).
// 근거: docs/plans/2026-06-23-guitar-controls-design.md §3.

export interface RigGuitarInfo {
  /** 기타 모델 slug (rigs/<rig>.md frontmatter guitar:). */
  guitar: string;
  /** 5-way 셀렉터 위치(1–5) → 이름(예: "브릿지 험버커"). */
  selectorMap: ReadonlyMap<number, string>;
  /** 코일 스플릿 지원이 명시됐는지(미확인/미지원이면 false → coilSplit:true 시 경고). */
  coilSplitSupported: boolean;
}

export type GuitarRegistry = ReadonlyMap<string, RigGuitarInfo>;

interface RigMeta {
  rig: string;
  guitar: string;
}

interface GuitarModel {
  model: string;
  selectorMap: Map<number, string>;
  coilSplitSupported: boolean;
}

/** rig md frontmatter 에서 rig·guitar slug 추출. 둘 중 하나라도 없으면 null. */
export function parseRigMeta(raw: string): RigMeta | null {
  let data: Record<string, unknown>;
  try {
    data = matter(raw).data as Record<string, unknown>;
  } catch {
    return null;
  }
  const rig = data.rig;
  const guitar = data.guitar;
  if (typeof rig !== "string" || typeof guitar !== "string") return null;
  return { rig, guitar };
}

// "5-way 셀렉터" 마커 줄을 찾고, 이어지는 "N. 이름" 목록을 맵으로.
function parseSelectorMap(body: string): Map<number, string> {
  const lines = body.split("\n");
  const map = new Map<number, string>();
  let started = false;
  for (const line of lines) {
    if (!started) {
      if (line.includes("5-way") && line.includes("셀렉터")) started = true;
      continue;
    }
    const m = line.match(/^\s*([1-5])\.\s+(.+?)\s*$/);
    if (m) {
      map.set(Number(m[1]), m[2].replace(/\*\*/g, "").trim());
      continue;
    }
    // 목록 시작 후 비-항목 줄(다음 섹션 등)을 만나면, 이미 항목을 모았으면 종료.
    if (map.size > 0 && line.trim() !== "") break;
  }
  return map;
}

// 코일 스플릿이 "확인 필요" 없이 언급되면 지원으로 본다(경고용 휴리스틱).
function detectCoilSplit(body: string): boolean {
  return body
    .split("\n")
    .some((l) => /코일\s*스플릿/.test(l) && !/확인\s*필요/.test(l));
}

/** 기타 모델 md → 셀렉터 맵·코일스플릿. model frontmatter 없으면 null. */
export function parseGuitarModel(raw: string): GuitarModel | null {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(raw);
  } catch {
    return null;
  }
  const model = (parsed.data as Record<string, unknown>).model;
  if (typeof model !== "string") return null;
  return {
    model,
    selectorMap: parseSelectorMap(parsed.content),
    coilSplitSupported: detectCoilSplit(parsed.content),
  };
}

/**
 * rig md 들 + 기타 모델 md 들 → rigSlug → RigGuitarInfo 레지스트리.
 * rig 가 가리키는 기타 모델이 없으면 그 rig 는 건너뛴다(parsePatch 가 rig 누락을 에러로 잡음).
 */
export function buildGuitarRegistry(
  rigRaws: readonly string[],
  guitarRaws: readonly string[],
): GuitarRegistry {
  const guitars = new Map<string, GuitarModel>();
  for (const raw of guitarRaws) {
    const g = parseGuitarModel(raw);
    if (g) guitars.set(g.model, g);
  }

  const registry = new Map<string, RigGuitarInfo>();
  for (const raw of rigRaws) {
    const meta = parseRigMeta(raw);
    if (!meta) continue;
    const g = guitars.get(meta.guitar);
    if (!g) continue;
    registry.set(meta.rig, {
      guitar: meta.guitar,
      selectorMap: g.selectorMap,
      coilSplitSupported: g.coilSplitSupported,
    });
  }
  return registry;
}
