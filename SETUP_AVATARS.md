# Avatar Upload Setup Guide

⚠️ **IMPORTANT**: The profile editing feature requires a Supabase Storage bucket. You must complete these steps first!

## 1. Create the Avatars Bucket

**In your Supabase Dashboard:**

1. Go to **Storage** in the left sidebar (https://supabase.com/dashboard/project/YOUR_PROJECT_ID/storage/buckets)
2. Click the green **"New bucket"** button
3. **Bucket name**: `avatars` (must be exactly this name)
4. **Public bucket**: Toggle **ON** (this allows avatar URLs to work without authentication)
5. Click **"Create bucket"**

✅ You should now see "avatars" in your list of buckets

## 2. Set Up Storage Policies

**After creating the bucket:**

1. Click on the **"avatars"** bucket
2. Go to the **"Policies"** tab
3. You'll need to add 4 policies. Click **"New policy"** for each one:

### Option A: Use the SQL Editor (Recommended - Faster!)

1. Go to **SQL Editor** in the left sidebar
2. Click **"New query"**
3. Copy and paste the entire contents of `setup-avatar-storage.sql` from this project
4. Click **"Run"**
5. Done! All policies are set up.

### Option B: Create Policies Manually (via UI)

If you prefer to use the Dashboard UI, create these 4 policies:

#### Policy 1: Upload own avatar

```sql
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Allow authenticated users to update their own avatars:

```sql
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Allow public access to read avatars:

```sql
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

## 3. Verify Database Schema

The `profiles` table should already have these columns (they're in the types):
- `avatar_url` (text, nullable)
- `bio` (text, nullable)

If they're missing, run:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
```

## 4. Test the Feature

1. Visit your profile page
2. Click **Edit Profile**
3. Upload an avatar image (JPG, PNG, or GIF under 2MB)
4. Add a bio (max 160 characters)
5. Click **Save Changes**

Your profile should update immediately with the new avatar and bio!
