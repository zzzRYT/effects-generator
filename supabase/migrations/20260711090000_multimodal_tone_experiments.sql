create table tone_experiments (
  id uuid primary key default gen_random_uuid(),
  request jsonb not null,
  youtube_url text not null,
  video_id text not null,
  segments jsonb not null,
  model_used text not null,
  prompt_version text not null,
  projector_version text not null,
  status text not null default 'queued'
    check (status in ('queued','analyzing','generating','projecting','ready','failed','evaluated')),
  progress jsonb not null default '{}',
  audio_observations jsonb,
  baseline_result jsonb,
  enriched_result jsonb,
  blind_assignment jsonb,
  evaluation jsonb,
  preferred_variant text
    check (preferred_variant is null or preferred_variant in ('baseline','enriched')),
  failure_code text,
  failure_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index tone_experiments_status_created
  on tone_experiments(status, created_at);

create trigger tone_experiments_updated before update on tone_experiments
for each row execute function set_updated_at();

alter table tone_experiments enable row level security;
-- No public policy: every read/write uses service_role after admin-session validation.
