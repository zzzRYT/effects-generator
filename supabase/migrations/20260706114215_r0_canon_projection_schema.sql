-- R0: 캐논·투영 부활 스키마 (설계: docs/plans/2026-07-06-canon-projection-revival-design.md §1, §6 R0)
-- 독립 엔티티 6(guitars/processors/songs/gear/canonical_tones/tones) + song_research + tone_jobs.
-- 07-04 구조 리셋 스키마(guitars/processors/songs/tones/tone_jobs/gear_onboarding_jobs, 3-role,
-- 1단 직접 생성)를 대체한다. 미적용·미커밋 상태였으므로 새 마이그레이션을 얹지 않고 이 파일 자체를 교체.
-- 변경 요지: gear·canonical_tones 신규, tones=투영 산출물로 재정의(canonical_tone_id 필수),
-- role 3종→5종, gear_onboarding_jobs 제거(어드민 수동 입력으로 대체, 큐 불필요).
-- ── 피벗 스키마 폐기 ──────────────────────────────────
-- 2026-06-25 피벗 스키마(processors[slug]/songs/patches/ratings/generation_jobs + save_generated_patch RPC)를
-- 걷어낸다. songs/processors는 이름이 겹치되 구조가 완전히 다르고(캐논·투영 스키마), 나머지는 이 리셋에서
-- 대체된다. 적용 직전 전체 데이터 백업: supabase/backups/20260706-pivot-schema-export.json.
-- (if exists + cascade — 빈 새 DB에서도 무해하게 통과.)
drop function if exists save_generated_patch(text, text, text, jsonb, text, text, text) cascade;
drop table if exists ratings cascade;
drop table if exists generation_jobs cascade;
drop table if exists patches cascade;
drop table if exists songs cascade;
drop table if exists processors cascade;

-- ── enum ─────────────────────────────────────────────
create type body_archetype as enum ('strat','tele','lespaul','sg','superstrat','hollow');
create type gear_status as enum ('draft','approved','rejected');
create type tone_role as enum ('lead','backing','solo','real_amp','phone');
-- 생성 플로우 단계(설계 §2): 접수→정규화→(캐시 미스 시)캐논 생성→투영→검증→노출.
create type tone_job_status as enum ('queued','resolving','generating_canon','projecting','validating','done','failed');

-- ── 독립 엔티티 ───────────────────────────────────────
-- 기타 KB. 서로 다른 엔티티를 참조하지 않는다(설계 §1).
create table guitars (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  brand text not null,
  model text not null,
  body_archetype body_archetype not null,
  pickups jsonb not null default '[]',            -- [{position, kind, note}]
  selector_positions jsonb not null default '[]', -- [{position, label}]
  controls jsonb not null default '{}',           -- {volume, tone, coil_split, ...}
  sources jsonb not null default '[]',            -- [{url|storage_path, kind, fetched_at}]
  confidence numeric,
  status gear_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 멀티 이펙터 KB. effects_catalog 가 투영 룩업이자 검증 기준(설계 §1 ToneProjector).
create table processors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  brand text not null,
  model text not null,
  modules jsonb not null default '[]',         -- 모듈 슬롯 구조 [{type, name, categories?}]
  effects_catalog jsonb not null default '{}', -- {exact:[FX Title], prefixes:[범위형 접두사]} (R1+에서 노브 정의·base_gear 역인덱스로 확장)
  amps jsonb not null default '[]',
  cabs jsonb not null default '[]',
  sources jsonb not null default '[]',
  confidence numeric,
  status gear_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 곡 정규화 레코드. 기어를 전혀 모른다.
create table songs (
  id uuid primary key default gen_random_uuid(),
  artist text not null,
  title text not null,
  artist_norm text not null,
  title_norm text not null,
  aliases jsonb not null default '[]', -- [{artist, title, source}] 학습 누적
  genre text,
  created_at timestamptz not null default now(),
  unique (artist_norm, title_norm)
);

-- 곡당 1회 톤 리서치 노트(캐논 생성 입력, 설계 §2 ③). 캐시 자체는 canonical_tones가 담당.
create table song_research (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references songs(id) on delete cascade,
  notes jsonb not null,      -- 구조화 리서치 노트(기어·주법·톤 특징)
  model_used text not null,
  created_at timestamptz not null default now(),
  unique (song_id)
);

-- 실기 KB(실제 앰프·페달). 캐논↔기기를 잇는 어휘(base_gear). 적재는 전부 어드민 수동(설계 §3, 크론 없음).
create table gear (
  id uuid primary key default gen_random_uuid(),
  name text not null,           -- 실기명, 예: "Ibanez TS-808"
  name_norm text not null,
  category text not null,       -- 자유 텍스트: amp/cab 및 이펙트 세부종류(OD/FUZZ/DLY 등). 종류가 늘 때마다 enum을 늘리지 않기 위해 text(YAGNI)
  attributes jsonb not null default '{}', -- 매칭 근거(클리핑·게인성격·EQ 캐릭터 등), 최소부터 시작
  sources jsonb not null default '[]',     -- [{url|storage_path, kind, fetched_at}] — 어드민 레퍼런스 업로드
  confidence numeric,
  status gear_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name_norm, category)
);

-- 캐논: 곡당 1회, 기기무관, 실기(gear) 기준. role 5종 중 해당 없는 파트는 chain=null + null_reason.
-- status 컬럼 없음 — 검증 게이트(스키마+gear KB 대조)를 통과한 것만 적재되므로 draft 상태가 존재하지 않는다.
create table canonical_tones (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references songs(id) on delete cascade,
  role tone_role not null,
  chain jsonb,        -- [{type, category?, base_gear:{name,category,attributes?,source?,confidence}, knobs(실기 기준), enabled, footswitch?}]
  null_reason text,
  confidence numeric,
  sources jsonb not null default '[]', -- 곡 리서치 근거(URL 등)
  model_used text not null,
  created_at timestamptz not null default now(),
  unique (song_id, role),
  check (chain is not null or null_reason is not null)
);

-- 투영 산출물. ToneProjector(스크립트, AI 없음)가 canonical_tones + processors.effects_catalog로 결정적 생성.
create table tones (
  id uuid primary key default gen_random_uuid(),
  canonical_tone_id uuid not null references canonical_tones(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  body_archetype body_archetype not null,
  processor_id uuid not null references processors(id) on delete cascade,
  role tone_role not null,
  signal_chain jsonb,        -- null = 이 곡에 해당 파트 없음(canonical_tones.null_reason 승계)
  null_reason text,
  label text,                -- 표시용 부제
  version int not null default 1,
  projector_version text not null, -- 투영 스크립트 버전(예: "projector:v1"). AI 모델명이 아님 — 투영은 결정적 변환
  created_at timestamptz not null default now(),
  unique (song_id, body_archetype, processor_id, role, version),
  check (signal_chain is not null or null_reason is not null)
);

-- ── 잡 ───────────────────────────────────────────────
-- 생성 잡. Realtime 으로 진행 푸시(연출 대기 포함).
create table tone_jobs (
  id uuid primary key default gen_random_uuid(),
  request jsonb not null,    -- 원본 입력 {artist, title, guitar, processor}
  song_id uuid references songs(id) on delete set null,
  body_archetype body_archetype,
  processor_id uuid references processors(id) on delete set null,
  status tone_job_status not null default 'queued',
  progress jsonb not null default '{}',       -- 단계별 타임스탬프(연출 표시용)
  failure_reason text,        -- 사용자용 메시지
  failure_detail text,        -- 내부 상세(노출 금지)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 인덱스 ───────────────────────────────────────────
create index gear_name_norm on gear (name_norm);
create index canonical_tones_song on canonical_tones (song_id);
create index tones_lookup on tones (song_id, body_archetype, processor_id);
create index tone_jobs_status on tone_jobs (status, created_at);

-- ── updated_at 트리거 ─────────────────────────────────
create or replace function set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger guitars_updated before update on guitars for each row execute function set_updated_at();
create trigger processors_updated before update on processors for each row execute function set_updated_at();
create trigger gear_updated before update on gear for each row execute function set_updated_at();
create trigger tone_jobs_updated before update on tone_jobs for each row execute function set_updated_at();

-- ── RLS ──────────────────────────────────────────────
-- 원칙: 공개 읽기 = approved/완성물만. 쓰기 = 서버(service role)만(정책 없음 = 차단).
-- gear·song_research·canonical_tones: 내부 어휘/근거 레이어 — 렌더러는 tones.signal_chain만 본다(데이터 계약).
-- 공개 read 정책을 두지 않는다(서버·어드민만, service role은 RLS 우회).
alter table guitars enable row level security;
alter table processors enable row level security;
alter table songs enable row level security;
alter table song_research enable row level security;
alter table gear enable row level security;
alter table canonical_tones enable row level security;
alter table tones enable row level security;
alter table tone_jobs enable row level security;

create policy guitars_public_read on guitars for select using (status = 'approved');
create policy processors_public_read on processors for select using (status = 'approved');
create policy songs_public_read on songs for select using (true);
create policy tones_public_read on tones for select using (true);
-- 진행 표시(Realtime 구독)용 — 내부 상세(failure_detail)는 뷰/컬럼 선택으로 노출 제한(웹은 status·progress·failure_reason 만 조회).
create policy tone_jobs_public_read on tone_jobs for select using (true);
-- song_research·gear·canonical_tones: 공개 정책 없음(서버·어드민 전용).

-- ── Realtime ─────────────────────────────────────────
alter publication supabase_realtime add table tone_jobs;
