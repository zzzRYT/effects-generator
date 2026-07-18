-- 오디오 랩 지점 선택 재설계: 역할별 배열 대신 단일 구간 하나만 저장(설계 §4).
-- 실 표본 수집 전 단계라 데이터 보존 없이 드롭 후 재생성(사용자 확인 완료).
alter table tone_experiments drop column segments;
alter table tone_experiments add column segment jsonb not null;
