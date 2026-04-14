-- Setup script for avatar uploads
-- Run this in Supabase SQL Editor

-- 1. Create the avatars bucket (if using SQL, otherwise create via Dashboard)
-- Note: Bucket creation via SQL requires admin access
-- It's easier to create via Dashboard: Storage > New bucket > name: "avatars" > Public: YES

-- 2. Set up storage policies for the avatars bucket

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to read avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 3. Verify profiles table has the needed columns (should already exist)
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
