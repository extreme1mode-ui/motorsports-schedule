-- Gantry: '한 바퀴' 순위표 (익명 사용자 1명 = 기기 1대)
-- 실행: Supabase SQL Editor에서 한 번. 0001_profiles.sql · 0002_likes.sql 다음이다. 다시 실행해도 된다(같은 결과).
--
-- - 한 사람은 서킷 · 기간마다 한 줄(가장 빠른 기록). 기간은 'all'(전체)과 ISO 주 key('2026-W47', 월요일 0시 UTC부터).
--   이번 주 key는 서버 시간으로 정한다(기기 시계를 믿지 않는다).
-- - 이름은 저장하지 않는다. 앱이 이름 씨(pid)에서 이름을 만든다(src/lap/player.js nameOf). pid는 처음 기록을 보낼 때
--   앱이 정한 값을 그대로 두고 바꾸지 않는다. user_id는 밖으로 내보내지 않는다.
-- - 테이블은 직접 읽거나 쓸 수 없다. 아래 두 함수로만 드나든다.
--   submit_lap: 로그인(익명 포함)한 사람만. 웹 앱이 한 바퀴를 끝낼 때 부른다. 토스는 부르지 않는다(읽기만).
--   lap_board: 누구나. /api/lap(Vercel)이 publishable 키로 부른다.

-- 1) 서킷: 받을 수 있는 가장 빠른 기록(ms)과 길이(m). 게임 엔진으로 계산한 '이탈 없이 낼 수 있는 가장 빠른 기록'의 95%
--    (tools/lap-sim과 같은 엔진, 2026-11). 새 서킷을 더할 때 여기에 한 줄 더한다.
create table if not exists public.lap_tracks (
  track_id text primary key check (track_id ~ '^[a-z0-9]{2,12}$'),
  min_ms   integer not null check (min_ms > 0),
  len_m    real not null check (len_m > 0)
);
insert into public.lap_tracks (track_id, min_ms, len_m) values
  ('jpn26', 90100, 5800.9),
  ('can26', 72100, 4346),
  ('mco26', 69400, 3316.2),
  ('gbr26', 89900, 5862.2),
  ('bel26', 101000, 6955.6),
  ('ita26', 81300, 5767.4),
  ('sgp26', 90300, 4930.9),
  ('usa26', 97900, 5512.1),
  ('mex26', 77100, 4296.2),
  ('bra26', 70600, 4284.8),
  ('lvg26', 90900, 6203.1),
  ('qat26', 85900, 5408.4),
  ('abu26', 86000, 5279)
on conflict (track_id) do update set min_ms = excluded.min_ms, len_m = excluded.len_m;

-- 2) 순위표의 나: 이름 씨(pid)와 마지막으로 보낸 때(빈도 제한)
create table if not exists public.lap_players (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  pid        text not null unique check (pid ~ '^p_[0-9a-f]{24}$'),
  last_at    timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 3) 기록: 사람 · 서킷 · 기간마다 가장 빠른 한 줄
create table if not exists public.lap_scores (
  user_id  uuid not null references auth.users (id) on delete cascade,
  track_id text not null references public.lap_tracks (track_id),
  period   text not null check (period = 'all' or period ~ '^[0-9]{4}-W[0-9]{2}$'),
  ms       integer not null check (ms between 1000 and 600000),
  react    integer check (react between 0 and 10000),
  ghost    jsonb,          -- 0.1초마다 위치(m). 1위의 움직임이 다른 사람의 옅은 차가 된다
  at       timestamptz not null default now(),
  primary key (user_id, track_id, period)
);
create index if not exists lap_scores_board_idx on public.lap_scores (track_id, period, ms, at);

alter table public.lap_tracks enable row level security;
alter table public.lap_players enable row level security;
alter table public.lap_scores enable row level security;
-- 정책을 만들지 않는다 = anon/authenticated는 테이블을 직접 읽거나 쓸 수 없다.
revoke all on table public.lap_tracks from anon, authenticated;
revoke all on table public.lap_players from anon, authenticated;
revoke all on table public.lap_scores from anon, authenticated;

-- 이번 주 key: ISO 주(월요일 0시 UTC). 앱의 weekOf와 같은 모양 '2026-W47'
create or replace function public.lap_week(t timestamptz)
returns text
language sql
immutable
set search_path = ''
as $$
  select to_char(t at time zone 'UTC', 'IYYY-"W"IW');
$$;

-- 4) 기록 보내기. 전체 · 이번 주 두 줄을 더 빠를 때만 바꾼다. 돌려주는 것: { pid, week, all_ms, week_ms }
--    받지 않는 것(오류): 로그인 안 함 · 없는 서킷 · 너무 빠르거나 느린 기록 · 기록과 맞지 않는 움직임 · 15초 안에 다시 보냄
create or replace function public.submit_lap(track text, ms integer, react integer, ghost jsonb, pid text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  t public.lap_tracks%rowtype;
  n integer;
  prev numeric := 0;
  v numeric;
  v_last timestamptz;
  my_pid text;
  wk text := public.lap_week(now());
  out_all integer;
  out_week integer;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select * into t from public.lap_tracks lt where lt.track_id = submit_lap.track;
  if not found then
    raise exception 'unknown track' using errcode = '22023';
  end if;
  if submit_lap.ms is null or submit_lap.ms < t.min_ms or submit_lap.ms > 600000 then
    raise exception 'implausible time' using errcode = '22023';
  end if;
  if submit_lap.react is not null and (submit_lap.react < 0 or submit_lap.react > 10000) then
    raise exception 'implausible reaction' using errcode = '22023';
  end if;
  if submit_lap.pid is null or submit_lap.pid !~ '^p_[0-9a-f]{24}$' then
    raise exception 'invalid pid' using errcode = '22023';
  end if;

  -- 움직임: 0.1초마다 위치(m). 개수가 기록 시간과 맞고, 뒤로 가지 않고, 0.1초에 12m(시속 432km)를 넘지 않고, 결승선 근처에서 끝난다
  if submit_lap.ghost is null or jsonb_typeof(submit_lap.ghost) <> 'array' or pg_column_size(submit_lap.ghost) > 40000 then
    raise exception 'invalid ghost' using errcode = '22023';
  end if;
  n := jsonb_array_length(submit_lap.ghost);
  if exists (select 1 from jsonb_array_elements(submit_lap.ghost) as e where jsonb_typeof(e) <> 'number') then
    raise exception 'invalid ghost' using errcode = '22023';
  end if;
  if n < submit_lap.ms / 100 - 5 or n > submit_lap.ms / 100 + 5 then
    raise exception 'ghost does not match time' using errcode = '22023';
  end if;
  for v in select (e)::text::numeric from jsonb_array_elements(submit_lap.ghost) as e loop
    if v < prev or v - prev > 12 then
      raise exception 'implausible ghost' using errcode = '22023';
    end if;
    prev := v;
  end loop;
  if prev < t.len_m - 30 or prev > t.len_m + 30 then
    raise exception 'ghost does not finish' using errcode = '22023';
  end if;

  -- 나: 처음이면 앱이 정한 pid로 만든다. 이미 있으면 그 pid를 그대로 쓴다(바꾸지 않는다). 다른 사람이 쓰는 pid면 오류
  select lp.pid, lp.last_at into my_pid, v_last from public.lap_players lp where lp.user_id = uid for update;
  if not found then
    insert into public.lap_players (user_id, pid) values (uid, submit_lap.pid) on conflict do nothing;
    select lp.pid into my_pid from public.lap_players lp where lp.user_id = uid;
    if my_pid is null then
      raise exception 'pid taken' using errcode = '23505';
    end if;
  else
    if v_last > now() - interval '15 seconds' then
      raise exception 'too many laps' using errcode = '54000';
    end if;
    update public.lap_players lp set last_at = now() where lp.user_id = uid;
  end if;

  insert into public.lap_scores as s (user_id, track_id, period, ms, react, ghost, at)
  values (uid, submit_lap.track, 'all', submit_lap.ms, submit_lap.react, submit_lap.ghost, now()),
         (uid, submit_lap.track, wk, submit_lap.ms, submit_lap.react, submit_lap.ghost, now())
  on conflict (user_id, track_id, period) do update
    set ms = excluded.ms, react = excluded.react, ghost = excluded.ghost, at = excluded.at
    where excluded.ms < s.ms;

  select s.ms into out_all from public.lap_scores s where s.user_id = uid and s.track_id = submit_lap.track and s.period = 'all';
  select s.ms into out_week from public.lap_scores s where s.user_id = uid and s.track_id = submit_lap.track and s.period = wk;
  return jsonb_build_object('pid', my_pid, 'week', wk, 'all_ms', out_all, 'week_ms', out_week);
end;
$$;

-- 5) 순위표: 위 50줄 + 사람 수 + 1위의 움직임. period는 'week'(이번 주) 또는 'all'.
--    ms를 주면 그 기록이 설 자리(pid를 주면 그 사람의 줄은 빼고 센다): 앞에 있는 사람 수, 바로 위 두 줄, 바로 아래 두 줄
--    돌려주는 것: { period, count, rows: [{ pid, ms, at }], top_ghost, ctx: { ahead, above, below, listed } | null }
create or replace function public.lap_board(track text, period text, ms integer default null, pid text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  key text;
  uid uuid;
  cnt integer;
  v_rows jsonb;
  top_ghost jsonb;
  ctx jsonb := null;
begin
  if lap_board.period = 'week' then
    key := public.lap_week(now());
  elsif lap_board.period = 'all' then
    key := 'all';
  else
    raise exception 'invalid period' using errcode = '22023';
  end if;
  if lap_board.track is null or lap_board.track !~ '^[a-z0-9]{2,12}$' then
    raise exception 'invalid track' using errcode = '22023';
  end if;

  select count(*)::int into cnt from public.lap_scores s where s.track_id = lap_board.track and s.period = key;

  select coalesce(jsonb_agg(jsonb_build_object('pid', x.pid, 'ms', x.ms, 'at', (extract(epoch from x.at) * 1000)::bigint) order by x.ms, x.at), '[]'::jsonb)
    into v_rows
  from (
    select lp.pid, s.ms, s.at
    from public.lap_scores s join public.lap_players lp on lp.user_id = s.user_id
    where s.track_id = lap_board.track and s.period = key
    order by s.ms, s.at
    limit 50
  ) x;

  select s.ghost into top_ghost
  from public.lap_scores s
  where s.track_id = lap_board.track and s.period = key
  order by s.ms, s.at
  limit 1;

  if lap_board.ms is not null then
    if lap_board.pid is not null then
      select lp.user_id into uid from public.lap_players lp where lp.pid = lap_board.pid;
    end if;
    select jsonb_build_object(
      'ahead', (select count(*)::int from public.lap_scores s
                where s.track_id = lap_board.track and s.period = key and s.ms <= lap_board.ms and s.user_id is distinct from uid),
      'above', (select coalesce(jsonb_agg(jsonb_build_object('pid', y.pid, 'ms', y.ms) order by y.ms, y.at), '[]'::jsonb) from (
                  select lp.pid, s.ms, s.at from public.lap_scores s join public.lap_players lp on lp.user_id = s.user_id
                  where s.track_id = lap_board.track and s.period = key and s.ms <= lap_board.ms and s.user_id is distinct from uid
                  order by s.ms desc, s.at desc limit 2) y),
      'below', (select coalesce(jsonb_agg(jsonb_build_object('pid', y.pid, 'ms', y.ms) order by y.ms, y.at), '[]'::jsonb) from (
                  select lp.pid, s.ms, s.at from public.lap_scores s join public.lap_players lp on lp.user_id = s.user_id
                  where s.track_id = lap_board.track and s.period = key and s.ms > lap_board.ms and s.user_id is distinct from uid
                  order by s.ms, s.at limit 2) y),
      'listed', uid is not null and exists (select 1 from public.lap_scores s where s.track_id = lap_board.track and s.period = key and s.user_id = uid)
    ) into ctx;
  end if;

  return jsonb_build_object('period', key, 'count', cnt, 'rows', v_rows, 'top_ghost', top_ghost, 'ctx', ctx);
end;
$$;

revoke all on function public.lap_week(timestamptz) from public, anon, authenticated;
revoke all on function public.submit_lap(text, integer, integer, jsonb, text) from public, anon, authenticated;
revoke all on function public.lap_board(text, text, integer, text) from public, anon, authenticated;
grant execute on function public.submit_lap(text, integer, integer, jsonb, text) to authenticated;
grant execute on function public.lap_board(text, text, integer, text) to anon, authenticated;
