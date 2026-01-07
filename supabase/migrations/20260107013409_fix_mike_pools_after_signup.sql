-- Fix pools for mike@berkman.co
-- This migration links Mike's player record to his auth user and sets him as owner of all pools
-- It's safe to run multiple times (idempotent)

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
    -- User doesn't exist yet, nothing to do
    return;
  end if;
  
  -- Link Mike's player record to his auth user
  update players
  set user_id = mike_user_id
  where id = mike_player_id;
  
  -- Set Mike as owner of all pools (that don't have an owner)
  update pools
  set owner_id = mike_user_id
  where owner_id is null;
  
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
end $$;

