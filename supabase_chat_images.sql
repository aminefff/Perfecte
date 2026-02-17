
-- 1. إضافة عمود الصور إلى جدول الرسائل
ALTER TABLE public.community_messages 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. إنشاء سلة تخزين (Bucket) للصور
INSERT INTO storage.buckets (id, name, public)
VALUES ('community_images', 'community_images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. سياسات الأمان (RLS) للسماح برفع الصور وعرضها
-- السماح للجميع (المصادق عليهم وغيرهم) بعرض الصور
DROP POLICY IF EXISTS "Public View Images" ON storage.objects;
CREATE POLICY "Public View Images" ON storage.objects FOR SELECT USING (bucket_id = 'community_images');

-- السماح للمستخدمين المسجلين فقط برفع الصور (صور فقط، لا فيديو)
DROP POLICY IF EXISTS "Authenticated Upload Images" ON storage.objects;
CREATE POLICY "Authenticated Upload Images" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'community_images' AND
    auth.role() = 'authenticated' AND
    (lower(storage.extension(name)) = 'png' OR lower(storage.extension(name)) = 'jpg' OR lower(storage.extension(name)) = 'jpeg' OR lower(storage.extension(name)) = 'gif' OR lower(storage.extension(name)) = 'webp')
);

-- السماح للمستخدم بحذف صوره الخاصة فقط
DROP POLICY IF EXISTS "User Delete Own Images" ON storage.objects;
CREATE POLICY "User Delete Own Images" ON storage.objects FOR DELETE USING (
    bucket_id = 'community_images' AND
    auth.uid() = owner
);
