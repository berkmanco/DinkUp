-- Fix pools for mike@berkman.co
-- Run this after Mike signs up to link his player record and set him as owner of all pools

do $$
declare
  mike_user_id uuid;
  mike_player_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
begin
  -- Find mike@berkman.co in auth.users
  select id into mike_user_id
  from auth.users
  where email = 'mike@berkman.co'
  limit 1;
  
  if mike_user_id is null then
    raise notice 'User mike@berkman.co not found in auth.users';
    return;
  end if;
  
  raise notice 'Found user: %', mike_user_id;
  
  -- Link Mike's player record to his auth user
  update players
  set user_id = mike_user_id
  where id = mike_player_id;
  
  raise notice 'Linked player record to user';
  
  -- Set Mike as owner of all pools (that don't have an owner)
  update pools
  set owner_id = mike_user_id
  where owner_id is null;
  
  raise notice 'Set Mike as owner of all pools without owner';
  
  -- Also ensure Mike is in all pools via pool_players
  insert into pool_players (pool_id, player_id, is_active)
  select id, mike_player_id, true
  from pools
  where id not in (
    select pool_id
    from pool_players
    where player_id = mike_player_id
  )
  on conflict (pool_id, player_id) do nothing;
  
  raise notice 'Ensured Mike is in all pools';
end $$;

