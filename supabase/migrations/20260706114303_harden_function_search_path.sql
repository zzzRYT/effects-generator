-- 보안 보강: set_updated_at 트리거 함수의 search_path 고정 (어드바이저 0011 대응).
-- 가변 search_path는 함수가 예기치 않은 스키마의 객체를 참조할 수 있게 하는 리스크 —
-- 빈 search_path로 고정한다(now()는 pg_catalog 소속이라 빈 search_path에서도 접근 가능).
create or replace function set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$ begin new.updated_at = now(); return new; end $$;
