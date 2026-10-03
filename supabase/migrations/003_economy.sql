create table campus_private.property_ownership (
 room_id uuid not null references campus_private.rooms(id),space_index integer not null references campus_private.board_spaces(space_index),
 owner_player_id uuid not null,primary key(room_id,space_index),
 foreign key(room_id,owner_player_id) references campus_private.players(room_id,id)
);
create or replace function campus_private.snapshot(p_room uuid) returns jsonb language sql stable set search_path = '' as $$
 select jsonb_build_object('room_session_id',r.room_session_id,'status',r.status,'host_player_id',r.host_player_id,
 'revision',g.revision,'current_player_id',g.current_player_id,'phase',g.phase,'pending_property',g.pending_property,
 'last_die',g.last_die,'match_ends_at',g.match_ends_at,'turn_ends_at',g.turn_ends_at,
 'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'seat',p.seat,'cash',p.cash,'position',p.position,'last_seen_at',p.last_seen_at) order by p.seat) from campus_private.players p where p.room_id=r.id),'[]'::jsonb),
 'ownership',coalesce((select jsonb_object_agg(space_index::text,owner_player_id) from campus_private.property_ownership where room_id=r.id),'{}'::jsonb),
 'events',coalesce((select jsonb_agg(e order by e.sequence) from (select sequence,message,created_at from campus_private.game_events where room_id=r.id order by sequence desc limit 40) e),'[]'::jsonb))
 from campus_private.rooms r join campus_private.game_state g on g.room_id=r.id where r.id=p_room;
$$;
create or replace function campus_private.resolve_landing(p_room uuid,p_player uuid) returns boolean language plpgsql set search_path = '' as $$
declare p campus_private.players; space campus_private.board_spaces; owner campus_private.players; card integer; amount integer; label text;
begin
 select * into p from campus_private.players where id=p_player and room_id=p_room;
 select * into space from campus_private.board_spaces where space_index=p.position;
 if space.kind='property' then
  select player.* into owner from campus_private.players player join campus_private.property_ownership o on o.owner_player_id=player.id where o.room_id=p_room and o.space_index=p.position;
  if not found then
   update campus_private.game_state set phase='awaiting_purchase',pending_property=p.position where room_id=p_room;
   insert into campus_private.game_events(room_id,message) values(p_room,p.name || ' landed on ' || space.name || '. Buy for $' || space.price || ' or skip.');
   return true;
  elsif owner.id<>p.id then
   update campus_private.players set cash=cash-space.rent where id=p.id;
   update campus_private.players set cash=cash+space.rent where id=owner.id;
   insert into campus_private.game_events(room_id,message) values(p_room,p.name || ' paid ' || owner.name || ' $' || space.rent || ' rent at ' || space.name);
  else
   insert into campus_private.game_events(room_id,message) values(p_room,p.name || ' visited their own ' || space.name);
  end if;
 elsif space.kind='fee' then
  update campus_private.players set cash=cash-space.fee where id=p.id;
  insert into campus_private.game_events(room_id,message) values(p_room,p.name || ' paid $' || space.fee || ' for ' || space.name);
 elsif space.kind='event' then
  card:=floor(random()*4)::integer;
  amount:=case card when 0 then 150 when 1 then -75 when 2 then 50 else -100 end;
  label:=case card when 0 then 'Scholarship' when 1 then 'Parking Ticket' when 2 then 'Free Coffee' else 'Campus Construction' end;
  update campus_private.players set cash=cash+amount where id=p.id;
  insert into campus_private.game_events(room_id,message) values(p_room,p.name || ': ' || label || ' (' || case when amount>0 then '+$' || amount else '-$' || abs(amount) end || ')');
 end if;
 return false;
end; $$;
create function campus_private.purchase(p_room uuid,p_player uuid,p_buy boolean,p_time timestamptz) returns void language plpgsql set search_path = '' as $$
declare g campus_private.game_state;p campus_private.players;space campus_private.board_spaces;
begin
 select * into g from campus_private.game_state where room_id=p_room;
 select * into p from campus_private.players where id=p_player and room_id=p_room;
 if g.phase<>'awaiting_purchase' or g.pending_property is null then raise exception 'There is no property to buy'; end if;
 select * into space from campus_private.board_spaces where space_index=g.pending_property;
 if space.kind<>'property' or p.position<>space.space_index then raise exception 'Invalid property decision'; end if;
 if exists(select 1 from campus_private.property_ownership where room_id=p_room and space_index=space.space_index) then raise exception 'This property is already owned'; end if;
 if p_buy then
  if p.cash<space.price then raise exception 'You do not have enough cash to buy this property'; end if;
  insert into campus_private.property_ownership values(p_room,space.space_index,p.id);
  update campus_private.players set cash=cash-space.price where id=p.id;
  insert into campus_private.game_events(room_id,message) values(p_room,p.name || ' bought ' || space.name || ' for $' || space.price);
 else
  insert into campus_private.game_events(room_id,message) values(p_room,p.name || ' skipped ' || space.name);
 end if;
 perform campus_private.next_turn(p_room,p_time);
end; $$;
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
  elsif p_action='buy' or p_action='skip' then
   perform campus_private.purchase(r.id,p.id,p_action='buy',t);
  else raise exception 'Unknown game action'; end if;
  s:=campus_private.publish(r.id);
 end if;
 if p_action<>'sync' then insert into campus_private.action_requests values(r.id,p.id,p_request,p_action,s); end if;
 return jsonb_build_object('snapshot',s,'server_now',t);
end; $$;

revoke all on all functions in schema campus_private from public,anon,authenticated;
