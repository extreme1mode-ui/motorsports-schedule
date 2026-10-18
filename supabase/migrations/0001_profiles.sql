-- Gantry: 익명 사용자 프로필 (관심 설정 + 개인 캘린더 토큰)
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  preferences    jsonb not null default '{}'::jsonb,
  calendar_token uuid not null unique default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;
-- 정책을 만들지 않는다 = anon/authenticated는 테이블을 직접 읽거나 쓸 수 없다. 아래 두 함수로만 드나든다.
revoke all on table public.profiles from anon, authenticated;

-- 1) 내 설정 저장 → 내 캘린더 토큰 반환 (익명 사용자 포함, 세션이 있어야 함)
create or replace function public.save_my_preferences(prefs jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  token uuid;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if prefs is null or jsonb_typeof(prefs) <> 'object' or pg_column_size(prefs) > 4096 then
    raise exception 'invalid preferences' using errcode = '22023';
  end if;

  insert into public.profiles as p (user_id, preferences)
  values (uid, prefs)
  on conflict (user_id) do update
    set preferences = excluded.preferences, updated_at = now()
    where p.preferences is distinct from excluded.preferences;

  select calendar_token into token from public.profiles where user_id = uid;
  return token;
end;
$$;

-- 2) 캘린더 토큰 → 캘린더에 필요한 값만 (시리즈별 관심 수준, 언어)
create or replace function public.calendar_preferences(token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('series', p.preferences -> 'series', 'locale', p.preferences -> 'locale')
  from public.profiles p
  where p.calendar_token = token;
$$;

revoke all on function public.save_my_preferences(jsonb) from public, anon, authenticated;
revoke all on function public.calendar_preferences(uuid) from public, anon, authenticated;
grant execute on function public.save_my_preferences(jsonb) to authenticated;
grant execute on function public.calendar_preferences(uuid) to anon;
