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

/** DB 조회 → resolveCore. songs/guitars/processors 를 병렬 조회(waterfall 회피). approved 기어만.
 * 기어는 slug 변형 집합으로 조회(정적/동적 규약 호환, 예: "gp-150" 또는 "gp150"). */
export async function resolveRequest(req: ToneRequest, deps: ResolverDeps = {}): Promise<ResolveResult> {
  const select = deps.select ?? sbSelect;
  const artist_norm = normArtist(req.artist);
  const title_norm = normTitle(req.title);
  const guitarVariants = slugVariants(req.guitar);
  const procVariants = slugVariants(req.processor);

  const [songs, guitars, processors] = await Promise.all([
    select<{ id: string }>(
      "songs",
      `artist_norm=eq.${enc(artist_norm)}&title_norm=eq.${enc(title_norm)}&select=id`,
    ),
    select<{ id: string; slug: string; body_archetype: BodyArchetype }>(
      "guitars",
      `slug=in.(${guitarVariants.map(enc).join(",")})&status=eq.approved&select=id,slug,body_archetype`,
    ),
    select<{ id: string; slug: string }>(
      "processors",
      `slug=in.(${procVariants.map(enc).join(",")})&status=eq.approved&select=id,slug`,
    ),
  ]);

  return resolveCore(req, {
    songId: songs[0]?.id ?? null,
    guitar: guitars[0] ?? null,
    processor: processors[0] ?? null,
  });
}
