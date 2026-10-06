-- Additive rules versioning: existing rooms retain version 1 and their original timer/rules.
alter table campus_private.rooms add column rules_version integer not null default 1;
-- Version 2 is explicitly requested by the new entry API; old deployed clients still create version 1 rooms.
alter table campus_private.players drop constraint players_position_check;
alter table campus_private.players add constraint players_position_check check(position between 0 and 39);
alter table campus_private.players add column character text;
alter table campus_private.players add column jailed boolean not null default false;
alter table campus_private.players add column jail_attempts integer not null default 0;
alter table campus_private.players add column bankrupt boolean not null default false;
alter table campus_private.players add column passes integer not null default 0;
alter table campus_private.players add column shield boolean not null default false;
alter table campus_private.players add column rent_bonus boolean not null default false;
alter table campus_private.players add column rent_collected integer not null default 0;
alter table campus_private.players add column turns_played integer not null default 0;
alter table campus_private.players add column achievements text[] not null default '{}';
create unique index unique_room_character on campus_private.players(room_id,character) where character is not null;
alter table campus_private.game_state drop constraint game_state_phase_check;
alter table campus_private.game_state add column dice integer[];
alter table campus_private.game_state add column doubles integer not null default 0;
alter table campus_private.game_state add column extra_roll boolean not null default false;
alter table campus_private.game_state add column started_at timestamptz;
alter table campus_private.game_state add column winner jsonb;
alter table campus_private.game_state add column auction jsonb;
alter table campus_private.game_state add column debt jsonb;
alter table campus_private.game_state add column active_event jsonb;
alter table campus_private.game_state add column movement jsonb;
create table campus_private.assets (
 room_id uuid not null references campus_private.rooms(id), space integer not null references campus_private.board_v2(id),
 owner uuid not null references campus_private.players(id), level integer not null default 0 check(level between 0 and 5),
 mortgaged boolean not null default false, primary key(room_id,space),
 foreign key(room_id,owner) references campus_private.players(room_id,id)
);
create table campus_private.trades (
 id uuid primary key default gen_random_uuid(),room_id uuid not null references campus_private.rooms(id),
 sender uuid not null, recipient uuid not null, give_spaces integer[] not null, take_spaces integer[] not null,
 give_cash integer not null check(give_cash>=0), take_cash integer not null check(take_cash>=0),
 asset_state jsonb not null default '{}',
 status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
 created_at timestamptz not null default now(), foreign key(room_id,sender) references campus_private.players(room_id,id),
 foreign key(room_id,recipient) references campus_private.players(room_id,id), check(sender<>recipient)
);
alter function campus_private.snapshot(uuid) rename to snapshot_legacy;
create function campus_private.snapshot(p_room uuid) returns jsonb language plpgsql stable set search_path='' as $$
declare r campus_private.rooms;g campus_private.game_state;s jsonb;
begin
 select * into r from campus_private.rooms where id=p_room;
 if r.rules_version=1 then return campus_private.snapshot_legacy(p_room); end if;
 select * into g from campus_private.game_state where room_id=p_room;
 s:=jsonb_build_object('rules_version',2,'room_session_id',r.room_session_id,'status',r.status,'host_player_id',r.host_player_id,
 'revision',g.revision,'current_player_id',g.current_player_id,'phase',g.phase,'pending_property',g.pending_property,'last_die',g.last_die,
 'dice',g.dice,'doubles',g.doubles,'extra_roll',g.extra_roll,'match_ends_at',g.match_ends_at,'started_at',g.started_at,
 'turn_ends_at',g.turn_ends_at,'winner',g.winner,'auction',g.auction,'debt',g.debt,'active_event',g.active_event,'movement',g.movement,
 'players',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'seat',seat,'cash',cash,'position',position,'last_seen_at',last_seen_at,
 'character',character,'jailed',jailed,'jail_attempts',jail_attempts,'bankrupt',bankrupt,'passes',passes,'shield',shield,'rent_bonus',rent_bonus,
 'rent_collected',rent_collected,'turns_played',turns_played,'achievements',achievements) order by seat) from campus_private.players where room_id=p_room),'[]'::jsonb),
 'ownership',coalesce((select jsonb_object_agg(space,owner) from campus_private.assets where room_id=p_room),'{}'::jsonb),
 'assets',coalesce((select jsonb_object_agg(space,jsonb_build_object('owner',owner,'level',level,'mortgaged',mortgaged)) from campus_private.assets where room_id=p_room),'{}'::jsonb),
 'trades',coalesce((select jsonb_agg(to_jsonb(tr) order by created_at) from campus_private.trades tr where room_id=p_room and status='pending'),'[]'::jsonb),
 'events',coalesce((select jsonb_agg(e order by e.sequence) from (select sequence,message,created_at from campus_private.game_events where room_id=p_room order by sequence desc limit 80) e),'[]'::jsonb));
 return s;
end; $$;
create function campus_private.log(p_room uuid,p_message text) returns void language sql set search_path='' as $$
 insert into campus_private.game_events(room_id,message) values(p_room,p_message);
$$;
create function campus_private.badge(p_player uuid,p_badge text) returns void language plpgsql set search_path='' as $$
declare p campus_private.players;
begin
 select * into p from campus_private.players where id=p_player;
 if not p_badge=any(p.achievements) then
 update campus_private.players set achievements=array_append(achievements,p_badge) where id=p_player;
 perform campus_private.log(p.room_id,p.name || ' earned ' || p_badge || '!');
 end if;
end; $$;
-- One authoritative evaluator for all four conditions; no timer/net-worth winner in version 2.
create function campus_private.check_victory(p_room uuid) returns jsonb language plpgsql set search_path='' as $$
declare p campus_private.players;v text;side_won integer;sets integer;maxed integer;result jsonb;
begin
 select winner into result from campus_private.game_state where room_id=p_room;
 if result is not null then return result; end if;
 if (select status from campus_private.rooms where id=p_room)<>'active' then return null; end if;
 for p in select * from campus_private.players where room_id=p_room and not bankrupt order by seat loop
 v:=null; side_won:=null;
 if (select count(*) from campus_private.players where room_id=p_room and not bankrupt)=1 then v:='LAST_PLAYER_STANDING';
 elsif (select count(*) from campus_private.assets a join campus_private.board_v2 b on b.id=a.space where a.room_id=p_room and a.owner=p.id and b.data->>'kind'='station')=4 then v:='TRANSIT_MONOPOLY';
 else
 select (b.data->>'side')::integer into side_won from campus_private.board_v2 b where b.data->>'kind' in ('property','station') group by b.data->>'side'
 having count(*)=count(*) filter(where exists(select 1 from campus_private.assets a where a.room_id=p_room and a.space=b.id and a.owner=p.id)) order by b.data->>'side' limit 1;
 if side_won is not null then v:='STRAIGHT_LINE';
 else
 select count(*)::integer,count(*) filter(where fully)::integer into sets,maxed from (
 select b.data->>'category',bool_and(coalesce(a.level,0)=5 and not coalesce(a.mortgaged,false)) fully
 from campus_private.board_v2 b left join campus_private.assets a on a.room_id=p_room and a.space=b.id and a.owner=p.id
 where b.data->>'kind'='property' group by b.data->>'category' having bool_and(a.owner is not null)) groups;
 if sets>=3 and maxed>=2 then v:='PROPERTY_EMPIRE'; end if;
 end if;
 end if;
 if v is not null then
 result:=jsonb_build_object('winnerId',p.id,'type',v,'side',side_won);
 update campus_private.rooms set status='finished' where id=p_room and status='active';
 if found then
 update campus_private.game_state set winner=result,phase='finished',turn_ends_at=null,auction=null,debt=null where room_id=p_room;
 update campus_private.trades set status='cancelled' where room_id=p_room and status='pending';
 perform campus_private.log(p_room,'🏆 ' || upper(p.name) || ' WINS: ' || replace(v,'_',' ') || '!');
 end if;return result;
 end if;
 -- Achievement checks never finish a match.
 if sets>=1 then perform campus_private.badge(p.id,'FIRST MONOPOLY'); end if;
 if exists(select 1 from campus_private.assets a where a.room_id=p_room and a.owner=p.id and a.level>0) then perform campus_private.badge(p.id,'FIRST UPGRADE'); end if;
 if exists(select 1 from campus_private.assets a where a.room_id=p_room and a.owner=p.id and a.level=5) then perform campus_private.badge(p.id,'LANDMARK TYCOON'); end if;
 if (select count(*) from campus_private.assets a join campus_private.board_v2 b on b.id=a.space where a.room_id=p_room and a.owner=p.id and b.data->>'kind'='station')>=2 then perform campus_private.badge(p.id,'STATION MASTER'); end if;
 if (select count(distinct b.data->>'category') from campus_private.assets a join campus_private.board_v2 b on b.id=a.space where a.room_id=p_room and a.owner=p.id and b.data->>'kind'='property')>=4 then perform campus_private.badge(p.id,'COLLECTOR'); end if;
 if exists(select 1 from campus_private.board_v2 b where b.data->>'kind' in ('property','station') and not exists(select 1 from generate_series(0,2) off where not exists(select 1 from campus_private.assets a join campus_private.board_v2 q on q.id=a.space where a.room_id=p_room and a.owner=p.id and a.space=(b.id+off)%40 and q.data->>'kind' in ('property','station')))) then perform campus_private.badge(p.id,'THREE IN A ROW'); end if;
 sets:=null; maxed:=null;
 end loop;return null;
end; $$;
create function campus_private.next_v2(p_room uuid) returns void language plpgsql set search_path='' as $$
declare seat_now integer;next_id uuid;
begin
 if (select status from campus_private.rooms where id=p_room)<>'active' then return; end if;
 select p.seat into seat_now from campus_private.players p join campus_private.game_state g on g.current_player_id=p.id where g.room_id=p_room;
 select id into next_id from campus_private.players where room_id=p_room and not bankrupt order by case when seat>seat_now then 0 else 1 end,seat limit 1;
 update campus_private.game_state set current_player_id=next_id,phase='awaiting_roll',pending_property=null,doubles=0,extra_roll=false,active_event=null,turn_ends_at=clock_timestamp()+interval '30 seconds' where room_id=p_room;
 update campus_private.players set turns_played=turns_played+1 where id=next_id;
end; $$;
create function campus_private.after_landing(p_room uuid) returns void language plpgsql set search_path='' as $$
begin
 update campus_private.game_state set phase=case when extra_roll then 'awaiting_roll' else 'management' end,pending_property=null,turn_ends_at=clock_timestamp()+interval '30 seconds' where room_id=p_room;
end; $$;
create function campus_private.jail_v2(p_room uuid,p_player uuid) returns void language plpgsql set search_path='' as $$
begin
 update campus_private.players set position=30,jailed=true,jail_attempts=0 where id=p_player;
 update campus_private.game_state set movement=jsonb_build_object('player',p_player,'type','jail','to',30),extra_roll=false where room_id=p_room;
 perform campus_private.log(p_room,(select name from campus_private.players where id=p_player) || ' was sent to Jail.');
 perform campus_private.next_v2(p_room);
end; $$;
-- Mandatory debts stop play until liquidation/trade/payment or bankruptcy; cash never becomes negative.
create function campus_private.charge_v2(p_room uuid,p_player uuid,p_creditor uuid,p_amount integer,p_resume text default 'landing') returns boolean language plpgsql set search_path='' as $$
declare c integer;
begin
 if p_amount<=0 then return true; end if;
 select cash into c from campus_private.players where id=p_player;
 if c<p_amount then
 update campus_private.game_state set debt=jsonb_build_object('player',p_player,'creditor',p_creditor,'amount',p_amount,'resume',p_resume),phase='debt',turn_ends_at=clock_timestamp()+interval '30 seconds' where room_id=p_room;
 perform campus_private.log(p_room,(select name from campus_private.players where id=p_player) || ' owes $' || p_amount || '. Raise cash or declare bankruptcy.');return false;
 end if;
 update campus_private.players set cash=cash-p_amount where id=p_player;
 if p_creditor is not null then update campus_private.players set cash=cash+p_amount,rent_collected=rent_collected+p_amount where id=p_creditor; end if;
 perform campus_private.log(p_room,(select name from campus_private.players where id=p_player) || ' paid ' || coalesce((select name from campus_private.players where id=p_creditor),'the bank') || ' $' || p_amount || '.');
 return true;
end; $$;
create function campus_private.rent_v2(p_room uuid,p_space integer) returns integer language plpgsql stable set search_path='' as $$
declare a campus_private.assets;b jsonb;n integer;
begin
 select * into a from campus_private.assets where room_id=p_room and space=p_space;
 if not found or a.mortgaged then return 0; end if;
 select data into b from campus_private.board_v2 where id=p_space;
 if b->>'kind'='station' then
 select count(*) into n from campus_private.assets o join campus_private.board_v2 s on s.id=o.space where o.room_id=p_room and o.owner=a.owner and s.data->>'kind'='station';
 return 25*(2^(n-1))::integer;
 end if;
 n:=(b->'rents'->>a.level)::integer;
 if a.level=0 and not exists(select 1 from campus_private.board_v2 s where s.data->>'category'=b->>'category' and not exists(select 1 from campus_private.assets o where o.room_id=p_room and o.space=s.id and o.owner=a.owner and not o.mortgaged)) then n:=n*2; end if;
 return n;
end; $$;
create function campus_private.resolve_v2(p_room uuid,p_player uuid,p_depth integer default 0) returns void language plpgsql set search_path='' as $$
declare p campus_private.players;b jsonb;a campus_private.assets;e jsonb;k text;amount integer;dest integer;other campus_private.players;total integer;
begin
 if p_depth>6 then perform campus_private.after_landing(p_room);return; end if;
 select * into p from campus_private.players where id=p_player;
 select data into b from campus_private.board_v2 where id=p.position;k:=b->>'kind';
 perform campus_private.log(p_room,p.name || ' landed on ' || (b->>'name') || '.');
 if k in ('property','station') then
 select * into a from campus_private.assets where room_id=p_room and space=p.position;
 if not found then update campus_private.game_state set phase='awaiting_purchase',pending_property=p.position,turn_ends_at=clock_timestamp()+interval '30 seconds' where room_id=p_room;return;
 elsif a.owner<>p_player then
 amount:=campus_private.rent_v2(p_room,p.position);
 if p.shield and amount>0 then update campus_private.players set shield=false where id=p_player;perform campus_private.log(p_room,p.name || ' used rent protection.');amount:=0; end if;
 if amount>0 and (select rent_bonus from campus_private.players where id=a.owner) then amount:=amount*2;update campus_private.players set rent_bonus=false where id=a.owner;end if;
 if not campus_private.charge_v2(p_room,p_player,a.owner,amount) then return; end if;
 end if;
 elsif k='airport' then update campus_private.game_state set phase='airport',turn_ends_at=clock_timestamp()+interval '30 seconds' where room_id=p_room;return;
 elsif k='go_to_jail' then perform campus_private.jail_v2(p_room,p_player);return;
 elsif k='fee' then if not campus_private.charge_v2(p_room,p_player,null,(b->>'fee')::integer) then return; end if;
 elsif k='event' then
 -- Materialize one random ID; volatile random() in WHERE would be re-evaluated per row.
 dest:=floor(random()*(select count(*) from campus_private.event_deck))::integer;
 select data into e from campus_private.event_deck where id=dest;
 update campus_private.game_state set active_event=e where room_id=p_room;
 perform campus_private.log(p_room,'🎴 ' || p.name || ': ' || (e->>'name') || ' — ' || (e->>'description'));
 k:=e->>'kind';amount:=(e->>'value')::integer;
 if k='cash' then
 if amount>=0 then update campus_private.players set cash=cash+amount where id=p_player;
 elsif not campus_private.charge_v2(p_room,p_player,null,-amount) then return; end if;
 elsif k='jail' then perform campus_private.jail_v2(p_room,p_player);return;
 elsif k in ('move','travel','station') then
 dest:=case when k='move' then (p.position+amount+40)%40 when k='station' then ((p.position+5)/10*10+5)%40 else amount end;
 update campus_private.players set position=dest where id=p_player;
 update campus_private.game_state set movement=jsonb_build_object('player',p_player,'type','event','to',dest) where room_id=p_room;
 perform campus_private.resolve_v2(p_room,p_player,p_depth+1);return;
 elsif k='collect' then
 for other in select * from campus_private.players where room_id=p_room and id<>p_player and not bankrupt order by seat loop
 -- This card collects only available cash, avoiding simultaneous debtors. Normal rent/fees require full payment.
 total:=least(amount,greatest(other.cash,0));update campus_private.players set cash=cash-total where id=other.id;update campus_private.players set cash=cash+total where id=p_player;
 end loop;
 elsif k='pay' then
 select count(*)*amount into total from campus_private.players where room_id=p_room and id<>p_player and not bankrupt;
 if not campus_private.charge_v2(p_room,p_player,null,total,'event_pay') then return;end if;
 update campus_private.players set cash=cash+amount where room_id=p_room and id<>p_player and not bankrupt;
 elsif k in ('target','upgrade') then
 if k='upgrade' and not exists(select 1 from campus_private.assets where room_id=p_room and owner=p_player and level<5 and not mortgaged) then perform campus_private.log(p_room,'No eligible property for the grant.');
 else update campus_private.game_state set phase='event_choice' where room_id=p_room;return;end if;
 elsif k='shield' then update campus_private.players set shield=true where id=p_player;
 elsif k='bonus' then update campus_private.players set rent_bonus=true where id=p_player;
 elsif k='pass' then update campus_private.players set passes=passes+1 where id=p_player;
 end if;
 end if;
 perform campus_private.after_landing(p_room);
end; $$;
create function campus_private.bankrupt_v2(p_room uuid,p_player uuid) returns void language plpgsql set search_path='' as $$
declare d jsonb;creditor uuid;
begin
 select debt into d from campus_private.game_state where room_id=p_room;
 if d is null or d->>'player'<>p_player::text then raise exception 'No debt to resolve';end if;
 creditor:=(d->>'creditor')::uuid;
 if creditor is null then delete from campus_private.assets where room_id=p_room and owner=p_player;
 else
 update campus_private.players set cash=cash+(select greatest(cash,0) from campus_private.players where id=p_player) where id=creditor;
 update campus_private.assets set owner=creditor where room_id=p_room and owner=p_player;
 end if;
 update campus_private.players set cash=0,bankrupt=true,jailed=false where id=p_player;
 update campus_private.trades set status='cancelled' where room_id=p_room and status='pending' and (sender=p_player or recipient=p_player);
 update campus_private.game_state set debt=null,extra_roll=false where room_id=p_room;
 perform campus_private.log(p_room,(select name from campus_private.players where id=p_player) || ' declared bankruptcy.');
 perform campus_private.check_victory(p_room);perform campus_private.next_v2(p_room);
end; $$;
create function campus_private.manage_v2(p_room uuid,p_player uuid,p_space integer,p_action text,p_free boolean default false) returns void language plpgsql set search_path='' as $$
declare a campus_private.assets;b jsonb;cost integer;cash_now integer;levels integer;cat text;
begin
 select * into a from campus_private.assets where room_id=p_room and space=p_space and owner=p_player;
 if not found then raise exception 'You do not own that asset';end if;
 select data into b from campus_private.board_v2 where id=p_space;cat:=b->>'category';
 select cash into cash_now from campus_private.players where id=p_player;
 if p_action in ('upgrade','downgrade') then
 if b->>'kind'<>'property' or a.mortgaged then raise exception 'This asset cannot be developed';end if;
 if p_action='upgrade' then
 if a.level>=5 then raise exception 'Already a Landmark';end if;
 if exists(select 1 from campus_private.board_v2 s where s.data->>'category'=cat and not exists(select 1 from campus_private.assets o where o.room_id=p_room and o.space=s.id and o.owner=p_player and not o.mortgaged)) then raise exception 'Own the complete unmortgaged color group first';end if;
 select min(o.level) into levels from campus_private.assets o join campus_private.board_v2 s on s.id=o.space where o.room_id=p_room and s.data->>'category'=cat;
 if a.level<>levels then raise exception 'Build evenly across the group';end if;
 cost:=case when p_free then 0 else (b->>'upgrade_cost')::integer end;
 if cash_now<cost then raise exception 'Insufficient cash';end if;
 update campus_private.assets set level=level+1 where room_id=p_room and space=p_space;
 update campus_private.players set cash=cash-cost where id=p_player;
 else
 if a.level<=0 then raise exception 'No upgrades to sell';end if;
 select max(o.level) into levels from campus_private.assets o join campus_private.board_v2 s on s.id=o.space where o.room_id=p_room and s.data->>'category'=cat;
 if a.level<>levels then raise exception 'Sell upgrades evenly';end if;
 update campus_private.assets set level=level-1 where room_id=p_room and space=p_space;
 update campus_private.players set cash=cash+(b->>'upgrade_cost')::integer/2 where id=p_player;
 end if;
 elsif p_action='mortgage' then
 if a.mortgaged then raise exception 'Already mortgaged';end if;
 if exists(select 1 from campus_private.assets o join campus_private.board_v2 s on s.id=o.space where o.room_id=p_room and s.data->>'category'=cat and o.level>0) then raise exception 'Sell all upgrades in this group before mortgaging';end if;
 update campus_private.assets set mortgaged=true where room_id=p_room and space=p_space;
 update campus_private.players set cash=cash+(b->>'mortgage')::integer where id=p_player;
 elsif p_action='unmortgage' then
 if not a.mortgaged then raise exception 'This property is not mortgaged';end if;
 cost:=ceil((b->>'mortgage')::integer*1.1)::integer;
 if cash_now<cost then raise exception 'Insufficient cash';end if;
 update campus_private.assets set mortgaged=false where room_id=p_room and space=p_space;
 update campus_private.players set cash=cash-cost where id=p_player;
 elsif p_action='sell' then
 if exists(select 1 from campus_private.assets o join campus_private.board_v2 s on s.id=o.space where o.room_id=p_room and s.data->>'category'=cat and o.level>0) then raise exception 'Sell group upgrades first';end if;
 delete from campus_private.assets where room_id=p_room and space=p_space;
 update campus_private.players set cash=cash+case when a.mortgaged then 0 else (b->>'mortgage')::integer end where id=p_player;
 else raise exception 'Invalid management action';end if;
 perform campus_private.log(p_room,(select name from campus_private.players where id=p_player) || ' ' || p_action || ': ' || (b->>'name') || '.');
end; $$;
-- Entry behavior, room claims and persistent identity remain unchanged.
alter function public.campus_enter(text,text,text,text) rename to campus_enter_legacy;
revoke all on function public.campus_enter_legacy(text,text,text,text) from public,anon,authenticated,service_role;
create function public.campus_enter(p_action text,p_code text,p_name text,p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;r campus_private.rooms;p campus_private.players;choice text;
begin
 result:=public.campus_enter_legacy(p_action,p_code,p_name,p_token);
 select * into r from campus_private.rooms where room_session_id=result->>'room_session_id';
 if r.rules_version=2 and coalesce(current_setting('campus.expanded_entry',true),'')<>'1' then raise exception 'This room uses expanded rules. Refresh the app before joining';end if;
 select * into p from campus_private.players where id=(result->>'player_id')::uuid;
 if r.rules_version=2 and p.character is null then
 select c into choice from unnest(array['runner','cyclist','engineer','robot','coffee','skater','laptop','mascot']) with ordinality as options(c,n) where not exists(select 1 from campus_private.players where room_id=r.id and character=c) order by n limit 1;
 update campus_private.players set character=choice where id=p.id;
 result:=jsonb_set(result,'{snapshot}',campus_private.publish(r.id));
 end if;return result;
end; $$;
revoke all on function public.campus_enter(text,text,text,text) from public,anon,authenticated;
grant execute on function public.campus_enter(text,text,text,text) to service_role;
alter function public.campus_action(text,uuid,text,text,uuid,integer) rename to campus_action_legacy;
revoke all on function public.campus_action_legacy(text,uuid,text,text,uuid,integer) from public,anon,authenticated,service_role;
create function campus_private.settle_debt_v2(p_room uuid,p_player uuid) returns void language plpgsql set search_path='' as $$
declare d jsonb;g campus_private.game_state;amount integer;dest integer;
begin
 select * into g from campus_private.game_state where room_id=p_room;d:=g.debt;
 if d is null or d->>'player'<>p_player::text then raise exception 'No debt to resolve';end if;
 amount:=(d->>'amount')::integer;
 if (select cash from campus_private.players where id=p_player)<amount then raise exception 'Raise enough cash before paying';end if;
 perform campus_private.charge_v2(p_room,p_player,(d->>'creditor')::uuid,amount);
 update campus_private.game_state set debt=null where room_id=p_room;
 if d->>'resume'='jail_pay' then
 update campus_private.players set jailed=false,jail_attempts=0 where id=p_player;
 perform campus_private.badge(p_player,'JAILBREAK');
 update campus_private.game_state set phase='awaiting_roll' where room_id=p_room;
 elsif d->>'resume'='jail_move' then
 if (select position+g.dice[1]+g.dice[2]>=40 from campus_private.players where id=p_player) then perform campus_private.log(p_room,(select name from campus_private.players where id=p_player) || ' collected $100 for passing or landing on START.');end if;
 update campus_private.game_state set movement=jsonb_build_object('player',p_player,'type','walk','from',(select position from campus_private.players where id=p_player),'steps',g.dice[1]+g.dice[2],'to',(select (position+g.dice[1]+g.dice[2])%40 from campus_private.players where id=p_player)) where room_id=p_room;
 update campus_private.players set jailed=false,jail_attempts=0,cash=cash+case when position+g.dice[1]+g.dice[2]>=40 then 100 else 0 end,position=(position+g.dice[1]+g.dice[2])%40 where id=p_player;
 perform campus_private.badge(p_player,'JAILBREAK');perform campus_private.resolve_v2(p_room,p_player);
 else
 if d->>'resume'='event_pay' then
 update campus_private.players set cash=cash+(g.active_event->>'value')::integer where room_id=p_room and id<>p_player and not bankrupt;
 end if;
 perform campus_private.after_landing(p_room);
 end if;
end; $$;
create function campus_private.auction_v2(p_room uuid,p_space integer) returns void language plpgsql set search_path='' as $$
begin
 update campus_private.game_state set phase='auction',auction=jsonb_build_object('space',p_space,'bid',0,'bidder',null,'ends_at',clock_timestamp()+interval '30 seconds'),turn_ends_at=clock_timestamp()+interval '30 seconds' where room_id=p_room;
 perform campus_private.log(p_room,'Auction opened for ' || (select data->>'name' from campus_private.board_v2 where id=p_space) || '.');
end; $$;
create function public.campus_action(p_session text,p_player uuid,p_token text,p_action text,p_request uuid,p_revision integer,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r campus_private.rooms;p campus_private.players;g campus_private.game_state;old campus_private.action_requests;
 t timestamptz;signature text;s jsonb;b jsonb;tr campus_private.trades;
 die1 integer;die2 integer;dest integer;amount integer;idx integer;creditor uuid;target uuid;bidder uuid;spaces integer[];take integer[];give_cash integer;take_cash integer;expired boolean;item record;
begin
 select * into r from campus_private.rooms where room_session_id=p_session for update;
 if not found then raise exception 'Room unavailable';end if;
 if r.rules_version=1 then return public.campus_action_legacy(p_session,p_player,p_token,p_action,p_request,p_revision);end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>3000 then raise exception 'Invalid action payload';end if;
 t:=clock_timestamp();
 select * into p from campus_private.players where id=p_player and room_id=r.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if not found then raise exception 'Invalid player session';end if;
 update campus_private.players set last_seen_at=t where id=p.id;
 signature:=p_action || ':' || p_payload::text;
 select * into old from campus_private.action_requests where player_id=p.id and request_id=p_request;
 if found then
 if old.action<>signature then raise exception 'Request ID already used for a different action';end if;
 return jsonb_build_object('snapshot',campus_private.snapshot(r.id),'server_now',t);
 end if;
 select * into g from campus_private.game_state where room_id=r.id;
 -- Auctions use their own deadline; all callers may settle it once, under this same lock.
 expired:=r.status='active' and g.turn_ends_at is not null and t>=g.turn_ends_at;
 if expired then
 if g.phase='auction' then
 bidder:=(g.auction->>'bidder')::uuid;amount:=(g.auction->>'bid')::integer;idx:=(g.auction->>'space')::integer;
 if bidder is not null then
 if (select cash from campus_private.players where id=bidder)<amount then raise exception 'Auction cash invariant failed';end if;
 update campus_private.players set cash=cash-amount where id=bidder;
 insert into campus_private.assets(room_id,space,owner) values(r.id,idx,bidder);
 perform campus_private.log(r.id,(select name from campus_private.players where id=bidder) || ' won the auction for $' || amount || '.');
 else perform campus_private.log(r.id,'Auction closed without bids.');end if;
 update campus_private.game_state set auction=null where room_id=r.id;
 perform campus_private.after_landing(r.id);perform campus_private.check_victory(r.id);
 elsif g.phase='debt' then
 target:=(g.debt->>'player')::uuid;
 -- Disconnect recovery first liquidates upgrades and mortgages unmortgaged assets.
 for item in select a.*,b.data from campus_private.assets a join campus_private.board_v2 b on b.id=a.space where a.room_id=r.id and a.owner=target loop
 update campus_private.players set cash=cash+item.level*(item.data->>'upgrade_cost')::integer/2+case when item.mortgaged then 0 else (item.data->>'mortgage')::integer end where id=target;
 update campus_private.assets set level=0,mortgaged=true where room_id=r.id and space=item.space;
 end loop;
 if (select cash from campus_private.players where id=target)>=(g.debt->>'amount')::integer then perform campus_private.settle_debt_v2(r.id,target);
 else perform campus_private.bankrupt_v2(r.id,target);end if;
 elsif g.phase='awaiting_purchase' then perform campus_private.auction_v2(r.id,g.pending_property);
 else
 perform campus_private.log(r.id,'Inactive turn expired.');perform campus_private.next_v2(r.id);
 end if;
 s:=campus_private.publish(r.id);
 -- An expired action progresses the room, never executes a stale user's decision.
 elsif p_action in ('sync','advance-turn','finish-game') then
 s:=case when p_action='sync' then campus_private.refresh_presence(r.id) else campus_private.snapshot(r.id) end;
 elsif p_action='character' then
 if r.status<>'lobby' then raise exception 'Choose your character before the match';end if;
 if p_payload->>'character' not in ('runner','cyclist','engineer','robot','coffee','skater','laptop','mascot') or p_payload->>'character' is null then raise exception 'Invalid character';end if;
 if exists(select 1 from campus_private.players where room_id=r.id and character=p_payload->>'character' and id<>p.id) then raise exception 'That character is already taken';end if;
 update campus_private.players set character=p_payload->>'character' where id=p.id;s:=campus_private.publish(r.id);
 elsif p_action='start' then
 if r.status<>'lobby' then raise exception 'Match already started';end if;
 if r.host_player_id<>p.id then raise exception 'Only the host can start';end if;
 if (select count(*) from campus_private.players where room_id=r.id)<2 then raise exception 'At least two players are required';end if;
 if exists(select 1 from campus_private.players where room_id=r.id and character is null) then raise exception 'Choose a character first';end if;
 update campus_private.rooms set status='active' where id=r.id;
 update campus_private.game_state set current_player_id=p.id,started_at=t,match_ends_at=null,turn_ends_at=t+interval '30 seconds' where room_id=r.id;
 update campus_private.players set turns_played=1 where id=p.id;
 perform campus_private.log(r.id,'Buy. Build. Trade. Own the campus. Four routes to victory!');s:=campus_private.publish(r.id);
 else
 if r.status<>'active' then raise exception 'This match is not active';end if;
 if p.bankrupt then raise exception 'You are eliminated and can watch the match';end if;
 if p_action in ('trade-offer','trade-accept','trade-decline','trade-cancel','trade-counter','bid') then
 if g.phase='auction' and p_action<>'bid' then raise exception 'Finish the auction first';end if;
 else
 if g.current_player_id<>p.id then raise exception 'It is not your turn';end if;
 if g.revision<>p_revision then raise exception 'Board changed. Please try again';end if;
 end if;
 if p_action='roll' then
 if g.phase<>'awaiting_roll' then raise exception 'Resolve the current action first';end if;
 die1:=floor(random()*6)::integer+1;die2:=floor(random()*6)::integer+1;
 update campus_private.game_state set dice=array[die1,die2],last_die=die1,active_event=null,extra_roll=die1=die2 and not p.jailed,doubles=case when die1=die2 and not p.jailed then doubles+1 else 0 end where room_id=r.id;
 perform campus_private.log(r.id,p.name || ' rolled ' || die1 || ' + ' || die2 || ' = ' || (die1+die2) || '.');
 if p.jailed then
 update campus_private.game_state set extra_roll=false where room_id=r.id;
 if die1<>die2 and p.jail_attempts<2 then
 update campus_private.players set jail_attempts=jail_attempts+1 where id=p.id;perform campus_private.log(r.id,p.name || ' remains in Jail.');perform campus_private.next_v2(r.id);
 else
 if die1<>die2 and not campus_private.charge_v2(r.id,p.id,null,50,'jail_move') then
 s:=campus_private.publish(r.id);insert into campus_private.action_requests values(r.id,p.id,p_request,signature,s);return jsonb_build_object('snapshot',s,'server_now',t);end if;
 update campus_private.players set jailed=false,jail_attempts=0,cash=cash+case when position+die1+die2>=40 then 100 else 0 end,position=(position+die1+die2)%40 where id=p.id;
 if p.position+die1+die2>=40 then perform campus_private.log(r.id,p.name || ' collected $100 for passing or landing on START.');end if;
 perform campus_private.badge(p.id,'JAILBREAK');
 update campus_private.game_state set movement=jsonb_build_object('player',p.id,'type','walk','from',p.position,'steps',die1+die2,'to',(p.position+die1+die2)%40) where room_id=r.id;
 perform campus_private.resolve_v2(r.id,p.id);
 end if;
 elsif die1=die2 and g.doubles=2 then perform campus_private.jail_v2(r.id,p.id);
 else
 if die1=die2 then perform campus_private.badge(p.id,'DOUBLE TROUBLE');if g.doubles=1 then perform campus_private.badge(p.id,'LUCKY STREAK');end if;end if;
 dest:=p.position+die1+die2;
 update campus_private.players set position=dest%40,cash=cash+case when dest>=40 then 100 else 0 end where id=p.id;
 if dest>=40 then perform campus_private.log(r.id,p.name || ' collected $100 for passing or landing on START.');end if;
 update campus_private.game_state set movement=jsonb_build_object('player',p.id,'type','walk','from',p.position,'steps',die1+die2,'to',dest%40) where room_id=r.id;
 perform campus_private.resolve_v2(r.id,p.id);
 end if;
 elsif p_action in ('buy','skip') then
 if g.phase<>'awaiting_purchase' then raise exception 'No purchase is pending';end if;
 select data into b from campus_private.board_v2 where id=g.pending_property;
 if exists(select 1 from campus_private.assets where room_id=r.id and space=g.pending_property) then raise exception 'This asset is already owned';end if;
 if p_action='skip' then perform campus_private.auction_v2(r.id,g.pending_property);
 else
 amount:=(b->>'price')::integer;if p.cash<amount then raise exception 'Insufficient cash';end if;
 update campus_private.players set cash=cash-amount where id=p.id;
 insert into campus_private.assets(room_id,space,owner) values(r.id,g.pending_property,p.id);
 perform campus_private.log(r.id,p.name || ' bought ' || (b->>'name') || ' for $' || amount || '.');perform campus_private.after_landing(r.id);
 end if;
 elsif p_action='bid' then
 if g.phase<>'auction' then raise exception 'No auction is active';end if;
 amount:=(p_payload->>'amount')::integer;
 if amount is null or amount<1 or amount<=(g.auction->>'bid')::integer or amount>p.cash then raise exception 'Bid above the current bid using available cash';end if;
 update campus_private.game_state set auction=jsonb_set(jsonb_set(auction,'{bid}',to_jsonb(amount)),'{bidder}',to_jsonb(p.id)) where room_id=r.id;
 perform campus_private.log(r.id,p.name || ' bid $' || amount || '.');
 elsif p_action='travel' then
 if g.phase<>'airport' then raise exception 'You are not choosing an Airport destination';end if;
 dest:=(p_payload->>'destination')::integer;
 if dest is null or dest<0 or dest>=40 or dest=10 then raise exception 'Choose another valid space';end if;
 update campus_private.players set position=dest where id=p.id;
 update campus_private.game_state set movement=jsonb_build_object('player',p.id,'type','flight','from',10,'to',dest) where room_id=r.id;
 perform campus_private.badge(p.id,'TRAVELER');perform campus_private.log(r.id,p.name || ' flew to ' || (select data->>'name' from campus_private.board_v2 where id=dest) || '. No START salary.');perform campus_private.resolve_v2(r.id,p.id);
 elsif p_action in ('upgrade','downgrade','mortgage','unmortgage','sell') then
 if g.phase not in ('awaiting_roll','management','awaiting_purchase','debt','airport','event_choice') then raise exception 'Property management is unavailable';end if;
 if g.phase='debt' and p_action in ('upgrade','unmortgage') then raise exception 'Resolve your debt before spending';end if;
 perform campus_private.manage_v2(r.id,p.id,(p_payload->>'space')::integer,p_action);
 elsif p_action='end-turn' then
 if g.phase<>'management' then raise exception 'Resolve the current action or extra roll first';end if;
 perform campus_private.next_v2(r.id);
 elsif p_action in ('jail-pay','jail-pass') then
 if g.phase<>'awaiting_roll' or not p.jailed then raise exception 'You are not in Jail awaiting a roll';end if;
 if p_action='jail-pass' then
 if p.passes<1 then raise exception 'No Jail pass available';end if;
 update campus_private.players set passes=passes-1 where id=p.id;
 elsif not campus_private.charge_v2(r.id,p.id,null,50,'jail_pay') then
 s:=campus_private.publish(r.id);insert into campus_private.action_requests values(r.id,p.id,p_request,signature,s);return jsonb_build_object('snapshot',s,'server_now',t);
 end if;
 update campus_private.players set jailed=false,jail_attempts=0 where id=p.id;perform campus_private.badge(p.id,'JAILBREAK');
 elsif p_action='pay-debt' then perform campus_private.settle_debt_v2(r.id,p.id);
 elsif p_action='bankrupt' then
 if g.debt is null or (select cash from campus_private.players where id=p.id)>=(g.debt->>'amount')::integer then raise exception 'Pay your debt when you have enough cash';end if;
 perform campus_private.bankrupt_v2(r.id,p.id);
 elsif p_action='event-choice' then
 if g.phase<>'event_choice' then raise exception 'No event choice is pending';end if;
 if g.active_event->>'kind'='target' then
 target:=(p_payload->>'player')::uuid;
 if not exists(select 1 from campus_private.players where id=target and room_id=r.id and id<>p.id and not bankrupt) then raise exception 'Choose another active player';end if;
 update campus_private.players set cash=cash+(g.active_event->>'value')::integer where id=target;
 elsif g.active_event->>'kind'='upgrade' and not coalesce((p_payload->>'skip')::boolean,false) then
 perform campus_private.manage_v2(r.id,p.id,(p_payload->>'space')::integer,'upgrade',true);
 end if;
 perform campus_private.after_landing(r.id);
 elsif p_action in ('trade-offer','trade-counter') then
 if (select count(*) from campus_private.trades where room_id=r.id and sender=p.id and status='pending')>=5 then raise exception 'Resolve your existing trade offers first';end if;
 target:=(p_payload->>'recipient')::uuid;
 if not exists(select 1 from campus_private.players where room_id=r.id and id=target and id<>p.id and not bankrupt) then raise exception 'Choose another active player';end if;
 if p_action='trade-counter' then
 select * into tr from campus_private.trades where id=(p_payload->>'trade')::uuid and room_id=r.id and recipient=p.id and sender=target and status='pending';
 if not found then raise exception 'That offer is no longer available';end if;
 update campus_private.trades set status='declined' where id=tr.id;
 end if;
 if jsonb_typeof(p_payload->'give_spaces')<>'array' or jsonb_typeof(p_payload->'take_spaces')<>'array' then raise exception 'Choose valid trade assets';end if;
 spaces:=array(select jsonb_array_elements_text(p_payload->'give_spaces')::integer);take:=array(select jsonb_array_elements_text(p_payload->'take_spaces')::integer);
 give_cash:=(p_payload->>'give_cash')::integer;take_cash:=(p_payload->>'take_cash')::integer;
 if give_cash is null or take_cash is null or give_cash<0 or take_cash<0 or give_cash>p.cash or take_cash>(select cash from campus_private.players where id=target) then raise exception 'Trade requires available cash';end if;
 if cardinality(spaces)+cardinality(take)>40 or cardinality(spaces)<>(select count(distinct x) from unnest(spaces)x) or cardinality(take)<>(select count(distinct x) from unnest(take)x) or (cardinality(spaces)+cardinality(take)=0 and give_cash+take_cash=0) then raise exception 'Invalid trade assets';end if;
 if exists(select 1 from unnest(spaces) x where not exists(select 1 from campus_private.assets where room_id=r.id and space=x and owner=p.id)) or exists(select 1 from unnest(take) x where not exists(select 1 from campus_private.assets where room_id=r.id and space=x and owner=target)) then raise exception 'Trade includes assets not owned by the specified player';end if;
 if exists(select 1 from campus_private.assets a join campus_private.board_v2 b on b.id=a.space where a.room_id=r.id and a.level>0 and b.data->>'category' in (select data->>'category' from campus_private.board_v2 where id=any(spaces || take))) then raise exception 'Sell all group upgrades before trading';end if;
 insert into campus_private.trades(room_id,sender,recipient,give_spaces,take_spaces,give_cash,take_cash,asset_state) values(r.id,p.id,target,spaces,take,give_cash,take_cash,coalesce((select jsonb_object_agg(space,to_jsonb(owned)-'room_id') from campus_private.assets owned where room_id=r.id and space=any(spaces || take)),'{}'::jsonb));
 perform campus_private.log(r.id,p.name || ' proposed a trade.');
 elsif p_action in ('trade-accept','trade-decline','trade-cancel') then
 select * into tr from campus_private.trades where id=(p_payload->>'trade')::uuid and room_id=r.id and status='pending';
 if not found then raise exception 'That offer is no longer available';end if;
 if (p_action='trade-cancel' and tr.sender<>p.id) or (p_action<>'trade-cancel' and tr.recipient<>p.id) then raise exception 'This is not your offer to respond to';end if;
 if p_action='trade-accept' then
 if exists(select 1 from campus_private.players where id in (tr.sender,tr.recipient) and bankrupt) then raise exception 'A trader was eliminated';end if;
 if (select cash from campus_private.players where id=tr.sender)<tr.give_cash or p.cash<tr.take_cash then raise exception 'Trade cash is no longer available';end if;
 if exists(select 1 from unnest(tr.give_spaces) x where not exists(select 1 from campus_private.assets where room_id=r.id and space=x and owner=tr.sender)) or exists(select 1 from unnest(tr.take_spaces)x where not exists(select 1 from campus_private.assets where room_id=r.id and space=x and owner=tr.recipient)) then raise exception 'Trade ownership changed';end if;
 if tr.asset_state<>coalesce((select jsonb_object_agg(space,to_jsonb(owned)-'room_id') from campus_private.assets owned where room_id=r.id and space=any(tr.give_spaces || tr.take_spaces)),'{}'::jsonb) then raise exception 'Trade asset state changed. Propose a new offer';end if;
 if exists(select 1 from campus_private.assets a join campus_private.board_v2 b on b.id=a.space where a.room_id=r.id and a.level>0 and b.data->>'category' in (select data->>'category' from campus_private.board_v2 where id=any(tr.give_spaces || tr.take_spaces))) then raise exception 'Sell all group upgrades before trading';end if;
 update campus_private.assets set owner=tr.recipient where room_id=r.id and space=any(tr.give_spaces);
 update campus_private.assets set owner=tr.sender where room_id=r.id and space=any(tr.take_spaces);
 update campus_private.players set cash=cash-tr.give_cash+tr.take_cash where id=tr.sender;
 update campus_private.players set cash=cash+tr.give_cash-tr.take_cash where id=tr.recipient;
 update campus_private.trades set status='accepted' where id=tr.id;
 perform campus_private.log(r.id,p.name || ' completed a trade with ' || (select name from campus_private.players where id=tr.sender) || '.');
 else update campus_private.trades set status=case when p_action='trade-cancel' then 'cancelled' else 'declined' end where id=tr.id;
 end if;
 else raise exception 'Unknown game action';end if;
 perform campus_private.check_victory(r.id);s:=campus_private.publish(r.id);
 end if;
 if p_action<>'sync' then insert into campus_private.action_requests values(r.id,p.id,p_request,signature,s);end if;
 return jsonb_build_object('snapshot',s,'server_now',t);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'Invalid action values';
end; $$;
-- Retain the old six-argument API for deployed clients and legacy rooms.
create function public.campus_action(p_session text,p_player uuid,p_token text,p_action text,p_request uuid,p_revision integer) returns jsonb language sql security definer set search_path='' as $$
 select public.campus_action(p_session,p_player,p_token,p_action,p_request,p_revision,'{}'::jsonb);
$$;
revoke all on all functions in schema campus_private from public,anon,authenticated;
revoke all on function public.campus_action(text,uuid,text,text,uuid,integer,jsonb) from public,anon,authenticated;
revoke all on function public.campus_action(text,uuid,text,text,uuid,integer) from public,anon,authenticated;
grant execute on function public.campus_action(text,uuid,text,text,uuid,integer,jsonb) to service_role;
grant execute on function public.campus_action(text,uuid,text,text,uuid,integer) to service_role;

-- Opt-in entry prevents old cached clients from receiving a new board they cannot render.
create function public.campus_enter(p_action text,p_code text,p_name text,p_token text,p_rules_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;existing boolean;r campus_private.rooms;p campus_private.players;choice text;
begin
 if p_rules_version<>2 or p_rules_version is null then raise exception 'Unsupported rules version';end if;
 perform pg_advisory_xact_lock(hashtextextended(encode(sha256(convert_to(p_token,'UTF8')),'hex'),0));
 select exists(select 1 from campus_private.players where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex')) into existing;
 perform set_config('campus.expanded_entry','1',true);
 result:=public.campus_enter(p_action,p_code,p_name,p_token);
 select * into r from campus_private.rooms where room_session_id=result->>'room_session_id';
 if p_action='create' and not existing then update campus_private.rooms set rules_version=2 where id=r.id;end if;
 if (select rules_version from campus_private.rooms where id=r.id)=2 then
 for p in select * from campus_private.players where room_id=r.id and character is null order by seat loop
 select c into choice from unnest(array['runner','cyclist','engineer','robot','coffee','skater','laptop','mascot']) with ordinality as options(c,n) where not exists(select 1 from campus_private.players where room_id=r.id and character=c) order by n limit 1;
 update campus_private.players set character=choice where id=p.id;
 end loop;
 result:=jsonb_set(result,'{snapshot}',campus_private.publish(r.id));
 end if;
 return result;
end; $$;
revoke all on function public.campus_enter(text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.campus_enter(text,text,text,text,integer) to service_role;
