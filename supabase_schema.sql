
begin;

  -- 1. Add 'last_seen' column to profiles if it doesn't exist
  do $$ 
  begin 
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'last_seen') then
      alter table public.profiles add column last_seen timestamp with time zone default now();
    end if;
  end $$;

  -- 2. Allow users to update their own last_seen (Standard RLS)
  create policy "Users can update own last_seen" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

  -- 3. Enable Realtime on profiles to see status changes instantly
  alter publication supabase_realtime add table public.profiles;

  -- 4. Updated Analytics Function: Counts distinct users based on 'last_seen'
  -- This is much more accurate for "Active Users"
  create or replace function get_analytics_summary()
  returns json
  language plpgsql
  as $$
  declare
    active_now bigint;
    active_1h bigint;
    active_5h bigint;
    active_12h bigint;
    active_today bigint;
    active_week bigint;
  begin
    -- Active Now: Users seen in the last 2 minutes (Real-time online)
    select count(*) into active_now from profiles where last_seen > now() - interval '2 minutes';
    
    -- Recent history
    select count(*) into active_1h from profiles where last_seen > now() - interval '1 hour';
    select count(*) into active_5h from profiles where last_seen > now() - interval '5 hours';
    select count(*) into active_12h from profiles where last_seen > now() - interval '12 hours';
    select count(*) into active_today from profiles where last_seen > now() - interval '24 hours';
    select count(*) into active_week from profiles where last_seen > now() - interval '7 days';
    
    return json_build_object(
      'active_now', active_now,
      'active_1h', active_1h,
      'active_5h', active_5h,
      'active_12h', active_12h,
      'active_today', active_today,
      'active_week', active_week
    );
  end;
  $$;

  -- 5. Helper function to get the list of currently online users
  create or replace function get_online_users()
  returns setof profiles
  language sql
  as $$
    select * from profiles where last_seen > now() - interval '5 minutes' order by last_seen desc;
  $$;

commit;
