
-- 1. تفعيل نظام الحماية للصفوف
alter table public.profiles enable row level security;

-- 2. إضافة عمود آخر ظهور إذا لم يكن موجوداً
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'last_seen') then
    alter table public.profiles add column last_seen timestamp with time zone default now();
  end if;
end $$;

-- 3. سياسات الأمان (الحل لمشكلة عدم ظهور العدد)
-- السماح للجميع بقراءة بيانات المستخدمين (الاسم، الصورة، حالة الاتصال)
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);

-- السماح للمستخدم بتحديث وقت ظهوره الخاص فقط
drop policy if exists "Users can update own last_seen" on public.profiles;
create policy "Users can update own last_seen" on public.profiles for update using (auth.uid() = id);

-- 4. تفعيل التحديث المباشر للوحة التحكم
alter publication supabase_realtime add table public.profiles;

-- 5. دالة حساب الإحصائيات (محدثة ودقيقة)
create or replace function get_analytics_summary()
returns json
language plpgsql
security definer -- مهم جداً: تتجاوز الصلاحيات لضمان الحساب الدقيق
as $$
declare
  active_now bigint;
  active_1h bigint;
  active_5h bigint;
  active_12h bigint;
  active_today bigint;
  active_week bigint;
begin
  -- حساب المتصلين الآن (خلال آخر 5 دقائق)
  select count(*) into active_now from profiles where last_seen > now() - interval '5 minutes';
  
  -- حساب النشطين خلال فترات سابقة
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

-- 6. دالة جلب قائمة المتصلين حالياً
create or replace function get_online_users()
returns setof profiles
language sql
security definer
as $$
  select * from profiles 
  where last_seen > now() - interval '5 minutes' 
  order by last_seen desc;
$$;
