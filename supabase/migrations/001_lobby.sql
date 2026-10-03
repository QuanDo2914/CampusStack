-- All authoritative data is private. Only a signed room claim may read snapshots.
create schema if not exists campus_private;
revoke all on schema campus_private from public, anon, authenticated;
create table campus_private.rooms (
 id uuid primary key default gen_random_uuid(),
 code text not null unique check(code ~ '^[A-Z2-9]{6}$'),
 room_session_id text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text,'-',''),
 host_player_id uuid,
 status text not null default 'lobby' check(status in ('lobby','active','finished')),
 created_at timestamptz not null default now()
);
create table campus_private.players (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references campus_private.rooms(id),
 name text not null check(char_length(name) between 1 and 24), seat integer not null check(seat between 0 and 3),
 token_hash text not null unique, cash integer not null default 1500,
 position integer not null default 0 check(position between 0 and 19), last_seen_at timestamptz not null default now(),
 unique(room_id,seat), unique(room_id,name), unique(room_id,id)
);
alter table campus_private.rooms add constraint host_in_room foreign key(id,host_player_id) references campus_private.players(room_id,id) deferrable initially deferred;
create table campus_private.game_state (
 room_id uuid primary key references campus_private.rooms(id), revision integer not null default 0,
 current_player_id uuid, phase text not null default 'awaiting_roll' check(phase in ('awaiting_roll','awaiting_purchase','finished')),
 pending_property integer, last_die integer check(last_die between 1 and 6),
 match_ends_at timestamptz, turn_ends_at timestamptz,
 foreign key(room_id,current_player_id) references campus_private.players(room_id,id)
);
create table campus_private.game_events (
 sequence bigint generated always as identity primary key, room_id uuid not null references campus_private.rooms(id),
 message text not null, created_at timestamptz not null default now()
);
create table campus_private.action_requests (
 room_id uuid not null references campus_private.rooms(id), player_id uuid not null references campus_private.players(id),
 request_id uuid not null, action text not null, result jsonb not null, primary key(player_id,request_id)
);
create table public.room_snapshots (
 room_session_id text primary key, revision integer not null, snapshot jsonb not null
);
alter table public.room_snapshots enable row level security;
revoke all on public.room_snapshots from public, anon, authenticated;
grant select on public.room_snapshots to anon;
create policy room_claim_read on public.room_snapshots for select to anon
 using(room_session_id = (select auth.jwt()->>'room_session_id'));
-- No insert/update/delete policies exist for browser roles.
alter publication supabase_realtime add table public.room_snapshots;

create function campus_private.snapshot(p_room uuid) returns jsonb language sql stable set search_path = '' as $$
 select jsonb_build_object('room_session_id',r.room_session_id,'status',r.status,'host_player_id',r.host_player_id,
 'revision',g.revision,'current_player_id',g.current_player_id,'phase',g.phase,'pending_property',g.pending_property,
 'last_die',g.last_die,'match_ends_at',g.match_ends_at,'turn_ends_at',g.turn_ends_at,
 'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'seat',p.seat,'cash',p.cash,'position',p.position,'last_seen_at',p.last_seen_at) order by p.seat) from campus_private.players p where p.room_id=r.id),'[]'::jsonb),
 'ownership','{}'::jsonb,
 'events',coalesce((select jsonb_agg(e order by e.sequence) from (select sequence,message,created_at from campus_private.game_events where room_id=r.id order by sequence desc limit 40) e),'[]'::jsonb))
 from campus_private.rooms r join campus_private.game_state g on g.room_id=r.id where r.id=p_room;
$$;
create function campus_private.publish(p_room uuid) returns jsonb language plpgsql set search_path = '' as $$
declare s jsonb;
begin
 update campus_private.game_state set revision=revision+1 where room_id=p_room;
 s:=campus_private.snapshot(p_room);
 insert into public.room_snapshots values(s->>'room_session_id',(s->>'revision')::integer,s)
 on conflict(room_session_id) do update set revision=excluded.revision,snapshot=excluded.snapshot;
 return s;
end; $$;
create function public.campus_enter(p_action text,p_code text,p_name text,p_token text) returns jsonb
 language plpgsql security definer set search_path = '' as $$
declare r campus_private.rooms; p campus_private.players; n integer; s jsonb; h text;
begin
 if p_token is null or char_length(p_token)<40 then raise exception 'Invalid player secret'; end if;
 if p_name is null or char_length(trim(p_name)) not between 1 and 24 then raise exception 'Use a name with 1–24 characters'; end if;
 h:=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 -- Retrying the same entry secret recovers its original seat, without duplicates.
 perform pg_advisory_xact_lock(hashtextextended(h,0));
 select * into p from campus_private.players where token_hash=h;
 if found then
  select * into r from campus_private.rooms where id=p.room_id for update;
  if p_action='join' and r.code<>upper(trim(p_code)) then raise exception 'Session belongs to another room'; end if;
 else
  if p_action='create' then
   if p_code is null or p_code !~ '^[A-Z2-9]{6}$' then raise exception 'Invalid code'; end if;
   insert into campus_private.rooms(code) values(p_code) returning * into r;
   insert into campus_private.game_state(room_id) values(r.id);
  elsif p_action='join' then
   select * into r from campus_private.rooms where code=upper(trim(p_code)) for update;
   if not found then raise exception 'Room not found. Check the six-character code'; end if;
   if r.status<>'lobby' then raise exception 'This match has already started'; end if;
  else raise exception 'Unknown entry action'; end if;
  select count(*) into n from campus_private.players where room_id=r.id;
  if n>=4 then raise exception 'This room is full (4 players)'; end if;
  if exists(select 1 from campus_private.players where room_id=r.id and lower(name)=lower(trim(p_name))) then raise exception 'That name is already in use'; end if;
  insert into campus_private.players(room_id,name,seat,token_hash) values(r.id,trim(p_name),n,h) returning * into p;
  if n=0 then update campus_private.rooms set host_player_id=p.id where id=r.id; end if;
  insert into campus_private.game_events(room_id,message) values(r.id,p.name || ' joined the room');
 end if;
 s:=campus_private.publish(r.id);
 return jsonb_build_object('player_id',p.id,'room_session_id',r.room_session_id,'room_code',r.code,'snapshot',s,'server_now',clock_timestamp());
end; $$;
revoke all on function public.campus_enter(text,text,text,text) from public,anon,authenticated;
grant execute on function public.campus_enter(text,text,text,text) to service_role;

create function public.campus_action(p_session text,p_player uuid,p_token text,p_action text,p_request uuid,p_revision integer) returns jsonb
 language plpgsql security definer set search_path = '' as $$
declare r campus_private.rooms; p campus_private.players; g campus_private.game_state; s jsonb; old campus_private.action_requests; t timestamptz;
begin
 select * into r from campus_private.rooms where room_session_id=p_session for update;
 if not found then raise exception 'Room unavailable'; end if;
 t:=clock_timestamp();
 select * into p from campus_private.players where id=p_player and room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if not found then raise exception 'Invalid player session'; end if;
 update campus_private.players set last_seen_at=t where id=p.id;
 select * into g from campus_private.game_state where room_id=r.id;
 select * into old from campus_private.action_requests where player_id=p.id and request_id=p_request;
 if found then
  if old.action<>p_action then raise exception 'Request ID already used for a different action'; end if;
  return jsonb_build_object('snapshot',campus_private.snapshot(r.id),'server_now',t);
 end if;
 if p_action='sync' then
  return jsonb_build_object('snapshot',campus_private.publish(r.id),'server_now',t);
 elsif p_action='start' then
  if r.status<>'lobby' then raise exception 'Match already started'; end if;
  if r.host_player_id<>p.id then raise exception 'Only the host can start'; end if;
  if (select count(*) from campus_private.players where room_id=r.id)<2 then raise exception 'At least two players are required'; end if;
  update campus_private.rooms set status='active' where id=r.id;
  update campus_private.game_state set current_player_id=r.host_player_id,match_ends_at=t+interval '15 minutes',turn_ends_at=t+interval '30 seconds' where room_id=r.id;
  insert into campus_private.game_events(room_id,message) values(r.id,'Match started. You have 15 minutes!');
 else raise exception 'Unknown game action'; end if;
 s:=campus_private.publish(r.id);
 insert into campus_private.action_requests values(r.id,p.id,p_request,p_action,s);
 return jsonb_build_object('snapshot',s,'server_now',t);
end; $$;
revoke all on function public.campus_action(text,uuid,text,text,uuid,integer) from public,anon,authenticated;
grant execute on function public.campus_action(text,uuid,text,text,uuid,integer) to service_role;
revoke all on all functions in schema campus_private from public,anon,authenticated;
