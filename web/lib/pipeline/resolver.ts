// ToneRequestResolver — 사용자 입력(곡+기타+이펙터)을 정규화 튜플로 해소한다(설계 §1, §2 ①).
// 순수 코어(resolveCore, 판정)와 DB 래퍼(resolveRequest, 조회)를 분리 — 코어는 목 없이 테스트 가능.
// 미등록 기어는 문의 폼(기타·이펙터 추가 요청) 유도 신호(UnresolvedGear)로 반환(설계 §4).

import { normArtist, normTitle } from "../data/normalize";
import { slugify } from "../data/slugify";
import { sbSelect } from "../supabase/rest";
import type { BodyArchetype, ResolveResult, ToneRequest, UnresolvedGear } from "./types";

// 정적 시절 규약과의 호환성: slugify("GP-150")="gp-150"이지만 DB slug="gp150"
// 변형 집합 생성(문자↔숫자 경계 하이픈 제거/삽입)
export function slugVariants(input: string): string[] {
  const base = slugify(input);
  const variants = new Set([base]);

  // v2: 문자↔숫자 경계에서 하이픈 제거 ("gp-150" → "gp150")
  const v2 = base.replace(/-(?=[0-9])|(?<=[0-9])-/g, "");
  variants.add(v2);

  // v3: 문자↔숫자 경계에 하이픈 삽입 ("gp150" → "gp-150")
  const v3 = base.replace(/([a-z])(\d)/g, "$1-$2").replace(/(\d)([a-z])/g, "$1-$2");
  variants.add(v3);

  return Array.from(variants);
}

// slug 토큰화 — 문자↔숫자 경계 하이픈을 제거(gp-150→gp150)한 뒤 '-' 로 분할.
// "cort-g250"→["cort","g250"], "valeton-gp-150"→["valeton","gp150"]. 브랜드 프리픽스 매칭용.
export function slugTokens(slug: string): string[] {
  return slugify(slug)
    .replace(/-(?=[0-9])|(?<=[0-9])-/g, "")
    .split("-")
    .filter(Boolean);
}

// a 가 b 의 부분수열인가(순서 보존, 연속 불필요). ["g250"] ⊑ ["cort","g250"] = true.
function isSubsequence(a: string[], b: string[]): boolean {
  let i = 0;
  for (const t of b) if (i < a.length && a[i] === t) i++;
  return i === a.length;
}

// 3단 매칭(투영 정책): ① 정확/경계(slugVariants) → ② 토큰 부분수열.
// bare 모델 입력("G250")을 브랜드 프리픽스 DB slug("cort-g250")에 해소한다.
// 후보 중 첫 매치 반환(카탈로그는 어드민 큐레이션 소수 행 — 순서는 조회 정렬에 따름), 없으면 null.
export function matchGear<T extends { slug: string }>(input: string, candidates: T[]): T | null {
  const variants = new Set(slugVariants(input));
  const exact = candidates.find((c) => variants.has(c.slug));
  if (exact) return exact;

  const inputTokens = slugTokens(input);
  if (inputTokens.length === 0) return null;
  return candidates.find((c) => isSubsequence(inputTokens, slugTokens(c.slug))) ?? null;
}

// 조회 결과 묶음. 신곡이면 songId=null(미등록 아님 — 캐논 생성으로 만든다). 기어 null 이면 미등록.
export interface ResolverLookups {
  songId: string | null;
  guitar: { id: string; slug: string; body_archetype: BodyArchetype } | null;
  processor: { id: string; slug: string } | null;
}

/** 순수 판정 — 조회 결과 → ResolveResult. 기어 미등록이면 문의 유도, 아니면 정규화 튜플. */
export function resolveCore(req: ToneRequest, lu: ResolverLookups): ResolveResult {
  const unresolved: UnresolvedGear[] = [];
  if (!lu.guitar) unresolved.push({ kind: "guitar", query: req.guitar.trim() });
  if (!lu.processor) unresolved.push({ kind: "processor", query: req.processor.trim() });
  if (unresolved.length > 0) return { ok: false, unresolved };

  return {
    ok: true,
    resolved: {
      song: { id: lu.songId, artist_norm: normArtist(req.artist), title_norm: normTitle(req.title) },
      guitar: lu.guitar!,
      processor: lu.processor!,
    },
  };
}

export interface ResolverDeps {
  /** 테스트·대체 조회 주입(기본 sbSelect). */
  select?: typeof sbSelect;
}

const enc = encodeURIComponent;

/** DB 조회 → resolveCore. songs/guitars/processors 를 병렬 조회(waterfall 회피).
 * songs 는 정규화 키로 좁혀 조회. 기어는 approved 전체를 받아 matchGear 로 3단 매칭한다
 * (토큰 부분수열 tier 는 PostgREST in.() 로 표현 불가 — 소수 행이라 전체 fetch 비용 무시). */
export async function resolveRequest(req: ToneRequest, deps: ResolverDeps = {}): Promise<ResolveResult> {
  const select = deps.select ?? sbSelect;
  const artist_norm = normArtist(req.artist);
  const title_norm = normTitle(req.title);

  const [songs, guitars, processors] = await Promise.all([
    select<{ id: string }>(
      "songs",
      `artist_norm=eq.${enc(artist_norm)}&title_norm=eq.${enc(title_norm)}&select=id`,
    ),
    select<{ id: string; slug: string; body_archetype: BodyArchetype }>(
      "guitars",
      `status=eq.approved&select=id,slug,body_archetype`,
    ),
    select<{ id: string; slug: string }>(
      "processors",
      `status=eq.approved&select=id,slug`,
    ),
  ]);

  return resolveCore(req, {
    songId: songs[0]?.id ?? null,
    guitar: matchGear(req.guitar, guitars),
    processor: matchGear(req.processor, processors),
  });
}
