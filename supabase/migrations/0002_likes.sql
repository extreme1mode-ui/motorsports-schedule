-- Gantry: 경기별 즐겨찾기 수 (익명 사용자 1명 = 기기 1대)
-- 실행: Supabase SQL Editor에서 한 번. 0001_profiles.sql 다음이다.

create table if not exists public.likes (
  user_id    uuid not null references auth.users (id) on delete cascade,
  race_id    text not null check (race_id ~ '^[a-z0-9-]{1,80}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, race_id)
);
create index if not exists likes_race_id_idx on public.likes (race_id);

alter table public.likes enable row level security;
-- 정책을 만들지 않는다 = anon/authenticated는 테이블을 직접 읽거나 쓸 수 없다. 아래 두 함수로만 드나든다.
revoke all on table public.likes from anon, authenticated;

-- 1) 내 즐겨찾기 전체를 서버에 맞춘다. 로컬(paddock.fav)이 원본이다.
--    목록에 없는 줄은 지우고, 새 경기만 넣는다. 같은 목록을 다시 보내면 아무것도 바뀌지 않는다.
create or replace function public.save_my_likes(race_ids text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ids text[];
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if race_ids is null then
    race_ids := '{}';
  end if;
  if cardinality(race_ids) > 500 then
    raise exception 'too many race ids' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct x), '{}') into ids
  from unnest(race_ids) as x
  where x ~ '^[a-z0-9-]{1,80}$';

  delete from public.likes l
  where l.user_id = uid and not (l.race_id = any (ids));

  insert into public.likes (user_id, race_id)
  select uid, x from unnest(ids) as x
  on conflict do nothing;

  return cardinality(ids);
end;
$$;

-- 2) 경기별 수. 기준(10) 이상인 경기만 — 작은 수는 밖으로 내보내지 않는다.
create or replace function public.like_counts()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(t.race_id, t.n), '{}'::jsonb)
  from (
    select l.race_id, count(*)::int as n
    from public.likes l
    group by l.race_id
    having count(*) >= 10
  ) t;
$$;

revoke all on function public.save_my_likes(text[]) from public, anon, authenticated;
revoke all on function public.like_counts() from public, anon, authenticated;
grant execute on function public.save_my_likes(text[]) to authenticated;
grant execute on function public.like_counts() to anon;
