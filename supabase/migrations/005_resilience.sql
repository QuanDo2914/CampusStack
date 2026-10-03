-- Presence updates do not advance the gameplay revision.
create function campus_private.refresh_presence(p_room uuid) returns jsonb language plpgsql set search_path = '' as $$
declare s jsonb;
begin
 s:=campus_private.snapshot(p_room);
 update public.room_snapshots set snapshot=s where room_session_id=s->>'room_session_id';
 return s;
end; $$;
create table campus_private.rate_buckets(key text primary key,window_start timestamptz not null,hits integer not null);
create function public.campus_rate_limit(p_key text,p_limit integer) returns boolean language plpgsql security definer set search_path = '' as $$
declare count_now integer;t timestamptz:=clock_timestamp();
begin
 if p_limit not between 1 and 200 then raise exception 'Invalid rate limit'; end if;
 insert into campus_private.rate_buckets values(p_key,t,1)
 on conflict(key) do update set
 hits=case when campus_private.rate_buckets.window_start<t-interval '1 minute' then 1 else campus_private.rate_buckets.hits+1 end,
 window_start=case when campus_private.rate_buckets.window_start<t-interval '1 minute' then t else campus_private.rate_buckets.window_start end
 returning hits into count_now;
 -- Opportunistic cleanup; no scheduled jobs.
 if random()<0.01 then delete from campus_private.rate_buckets where window_start<t-interval '1 hour'; end if;
 return count_now<=p_limit;
end; $$;
revoke all on function public.campus_rate_limit(text,integer) from public,anon,authenticated;
grant execute on function public.campus_rate_limit(text,integer) to service_role;
create or replace function public.campus_action(p_session text,p_player uuid,p_token text,p_action text,p_request uuid,p_revision integer) returns jsonb
 language plpgsql security definer set search_path = '' as $$
declare r campus_private.rooms; p campus_private.players; g campus_private.game_state; s jsonb; old campus_private.action_requests; t timestamptz; die integer; moved integer;
begin
 select * into r from campus_private.rooms where room_session_id=p_session for update;
 if not found then raise exception 'Room unavailable'; end if;
 t:=clock_timestamp();
 select * into p from campus_private.players where id=p_player and room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if not found then raise exception 'Invalid player session'; end if;
 update campus_private.players set last_seen_at=t where id=p.id;
 select * into g from campus_private.game_state where room_id=r.id;
 -- Deadline evaluation occurs under the room lock, using current server time.
 if r.status='active' and t>=g.match_ends_at then
  perform campus_private.finish_game(r.id);
  return jsonb_build_object('snapshot',campus_private.publish(r.id),'server_now',t);
 end if;
 select * into old from campus_private.action_requests where player_id=p.id and request_id=p_request;
 if found then
  if old.action<>p_action then raise exception 'Request ID already used for a different action'; end if;
  return jsonb_build_object('snapshot',campus_private.snapshot(r.id),'server_now',t);
 end if;
 -- Any connected participant may progress an expired turn, without making choices for it.
 if r.status='active' and t>=g.turn_ends_at then
  insert into campus_private.game_events(room_id,message) select r.id,name || case when g.phase='awaiting_purchase' then ' ran out of time. Purchase skipped.' else ' ran out of time. Turn skipped.' end from campus_private.players where id=g.current_player_id;
  perform campus_private.next_turn(r.id,t);
  s:=campus_private.publish(r.id);
 elsif p_action='sync' or p_action='finish-game' or p_action='advance-turn' then
  -- An early finish/timeout request is harmless and never changes game results.
  s:=case when p_action='sync' then campus_private.refresh_presence(r.id) else campus_private.snapshot(r.id) end;
 elsif p_action='start' then
  if r.status<>'lobby' then raise exception 'Match already started'; end if;
  if r.host_player_id<>p.id then raise exception 'Only the host can start'; end if;
  if (select count(*) from campus_private.players where room_id=r.id)<2 then raise exception 'At least two players are required'; end if;
  update campus_private.rooms set status='active' where id=r.id;
  update campus_private.game_state set current_player_id=r.host_player_id,match_ends_at=t+interval '15 minutes',turn_ends_at=t+interval '30 seconds' where room_id=r.id;
  insert into campus_private.game_events(room_id,message) values(r.id,'Match started. You have 15 minutes!');
  s:=campus_private.publish(r.id);
 else
  if r.status<>'active' then raise exception 'This match is not active'; end if;
  if g.current_player_id<>p.id then raise exception 'It is not your turn'; end if;
  if g.revision<>p_revision then raise exception 'Board changed. Please try again'; end if;
  if p_action='roll' then
   if g.phase<>'awaiting_roll' then raise exception 'Choose buy or skip before continuing'; end if;
   die:=floor(random()*6)::integer+1; moved:=p.position+die;
   update campus_private.players set position=moved%20,cash=cash+case when moved>=20 then 100 else 0 end where id=p.id;
   update campus_private.game_state set last_die=die where room_id=r.id;
   insert into campus_private.game_events(room_id,message) values(r.id,p.name || ' rolled ' || die);
   if moved>=20 then insert into campus_private.game_events(room_id,message) values(r.id,p.name || ' reached START and collected $100'); end if;
   if not campus_private.resolve_landing(r.id,p.id) then perform campus_private.next_turn(r.id,t); end if;
  elsif p_action='buy' or p_action='skip' then
   perform campus_private.purchase(r.id,p.id,p_action='buy',t);
  else raise exception 'Unknown game action'; end if;
  s:=campus_private.publish(r.id);
 end if;
 if p_action<>'sync' then insert into campus_private.action_requests values(r.id,p.id,p_request,p_action,s); end if;
 return jsonb_build_object('snapshot',s,'server_now',t);
end; $$;


revoke all on all functions in schema campus_private from public,anon,authenticated;
