
-- 1. إضافة عمود للردود (يخزن بيانات الرسالة الأصلية كـ JSON لتجنب الاستعلامات المعقدة)
alter table public.community_messages 
add column if not exists reply_to jsonb;

-- 2. التأكد من وجود عمود التفاعلات وضبط القيمة الافتراضية
alter table public.community_messages 
add column if not exists reactions jsonb default '{}'::jsonb;

-- 3. تحسين الأداء: فهرس للبحث السريع عن رسائل مادة معينة
create index if not exists idx_community_messages_subject_id 
on public.community_messages(subject_id);

-- 4. سياسات الأمان (للتأكد من السماح بالتعديل على التفاعلات)
-- السماح للمستخدمين بتحديث الرسائل (لإضافة تفاعل) - يمكن تقييدها أكثر لاحقاً
create policy "Users can update reactions" 
on public.community_messages 
for update using (auth.uid() is not null);
