// 베스트에포트 인메모리 레이트리밋 — 생성 트리거 남용/비용 가드.
// ⚠️ 서버리스에선 인스턴스별 메모리라 완벽한 분산 제한은 아니다(진짜 분산은 Redis/Upstash = Phase 6+).
// 그래도 단일 인스턴스/로컬에서 명백한 연타·봇 남용을 막는 1차 방어선.

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5; // IP당 분당 5회 생성 트리거(캐시 히트는 호출측에서 제외).

const hits = new Map<string, number[]>();

export interface RateResult {
  ok: boolean;
  retryAfter?: number; // 초
}

export function rateLimit(ip: string, now: number = Date.now()): RateResult {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return { ok: false, retryAfter: Math.ceil((WINDOW_MS - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(ip, recent);
  // 메모리 누수 가드 — 맵이 커지면 만료 항목 정리.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return { ok: true };
}

/** 테스트/리셋용. */
export function _resetRateLimit(): void {
  hits.clear();
}
