alter table campus_private.game_state add column leaderboard jsonb not null default '[]'::jsonb;
create or replace function campus_private.finish_game(p_room uuid) returns void language plpgsql set search_path = '' as $$
declare scores jsonb;
begin
 update campus_private.rooms set status='finished' where id=p_room and status='active';
 if found then
  select jsonb_agg(to_jsonb(ranked) order by ranked.rank,ranked.seat) into scores from (
   select totals.*,dense_rank() over(order by net_worth desc)::integer as rank from (
    select p.id,p.name,p.seat,p.cash,coalesce(sum(b.price),0)::integer as property_value,
     (p.cash+coalesce(sum(b.price),0))::integer as net_worth
    from campus_private.players p left join campus_private.property_ownership o on o.owner_player_id=p.id and o.room_id=p.room_id
    left join campus_private.board_spaces b on b.space_index=o.space_index where p.room_id=p_room group by p.id
   ) totals
  ) ranked;
  update campus_private.game_state set phase='finished',pending_property=null,turn_ends_at=null,leaderboard=scores where room_id=p_room;
  insert into campus_private.game_events(room_id,message) values(p_room,'Time is up. Final scores are ready!');
 end if;
end; $$;
create or replace function campus_private.snapshot(p_room uuid) returns jsonb language sql stable set search_path = '' as $$
 select jsonb_build_object('room_session_id',r.room_session_id,'status',r.status,'host_player_id',r.host_player_id,
 'revision',g.revision,'current_player_id',g.current_player_id,'phase',g.phase,'pending_property',g.pending_property,
 'leaderboard',g.leaderboard,'last_die',g.last_die,'match_ends_at',g.match_ends_at,'turn_ends_at',g.turn_ends_at,
 'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'seat',p.seat,'cash',p.cash,'position',p.position,'last_seen_at',p.last_seen_at) order by p.seat) from campus_private.players p where p.room_id=r.id),'[]'::jsonb),
 'ownership',coalesce((select jsonb_object_agg(space_index::text,owner_player_id) from campus_private.property_ownership where room_id=r.id),'{}'::jsonb),
 'events',coalesce((select jsonb_agg(e order by e.sequence) from (select sequence,message,created_at from campus_private.game_events where room_id=r.id order by sequence desc limit 40) e),'[]'::jsonb))
 from campus_private.rooms r join campus_private.game_state g on g.room_id=r.id where r.id=p_room;
$$;

revoke all on all functions in schema campus_private from public,anon,authenticated;
