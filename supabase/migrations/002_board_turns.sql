create table campus_private.board_spaces (
 space_index integer primary key check(space_index between 0 and 19), name text not null,
 kind text not null check(kind in ('property','start','event','fee')), category text not null,
 price integer not null default 0 check(price>=0), rent integer not null default 0 check(rent>=0), fee integer not null default 0 check(fee>=0)
);
insert into campus_private.board_spaces values
 (0,'START','start','start',0,0,0),
 (1,'Engineering Cafe','property','food',180,35,0),
 (2,'Bike Hub','property','wellness',140,25,0),
 (3,'Campus Bulletin','event','event',0,0,0),
 (4,'Innovation Lab','property','innovation',300,65,0),
 (5,'Music Hall','property','arts',200,40,0),
 (6,'Campus Gym','property','wellness',220,45,0),
 (7,'Lab Materials','fee','fee',0,0,60),
 (8,'Student Apartments','property','housing',320,70,0),
 (9,'Art Studio','property','arts',160,30,0),
 (10,'Green Street Pizza','property','food',240,50,0),
 (11,'Student Union','event','event',0,0,0),
 (12,'Tech Park','property','innovation',360,80,0),
 (13,'Study Commons','property','housing',200,40,0),
 (14,'Library Cafe','property','food',180,35,0),
 (15,'Club Dues','fee','fee',0,0,50),
 (16,'Recreation Center','property','wellness',260,55,0),
 (17,'Makerspace','property','innovation',280,60,0),
 (18,'Campus Market','property','food',160,30,0),
 (19,'Quad Noticeboard','event','event',0,0,0);
create function campus_private.next_turn(p_room uuid,p_time timestamptz) returns void language plpgsql set search_path = '' as $$
declare seat_now integer; next_id uuid;
begin
 select p.seat into seat_now from campus_private.players p join campus_private.game_state g on g.current_player_id=p.id where g.room_id=p_room;
 select id into next_id from campus_private.players where room_id=p_room order by case when seat>seat_now then 0 else 1 end,seat limit 1;
 update campus_private.game_state set current_player_id=next_id,phase='awaiting_roll',pending_property=null,turn_ends_at=p_time+interval '30 seconds' where room_id=p_room;
end; $$;
create function campus_private.finish_game(p_room uuid) returns void language plpgsql set search_path = '' as $$
begin
 update campus_private.rooms set status='finished' where id=p_room and status='active';
 if found then
  update campus_private.game_state set phase='finished',pending_property=null,turn_ends_at=null where room_id=p_room;
  insert into campus_private.game_events(room_id,message) values(p_room,'Time is up. Final scores are ready!');
 end if;
end; $$;
-- Replaced with property/event resolution in Phase 3.
create function campus_private.resolve_landing(p_room uuid,p_player uuid) returns boolean language sql set search_path = '' as $$ select false $$;
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
  s:=case when p_action='sync' then campus_private.publish(r.id) else campus_private.snapshot(r.id) end;
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
  else raise exception 'Unknown game action'; end if;
  s:=campus_private.publish(r.id);
 end if;
 if p_action<>'sync' then insert into campus_private.action_requests values(r.id,p.id,p_request,p_action,s); end if;
 return jsonb_build_object('snapshot',s,'server_now',t);
end; $$;
revoke all on all functions in schema campus_private from public,anon,authenticated;
