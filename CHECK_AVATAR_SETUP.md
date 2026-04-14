# Quick Diagnostic: Check Avatar Setup

## Step 1: Check Browser Console

1. Open your browser's Developer Tools (F12 or Right-click > Inspect)
2. Go to the **Console** tab
3. Try uploading an avatar
4. Look for error messages that say:

- **"Bucket not found"** → You need to create the `avatars` bucket
- **"new row violates row-level security policy"** → You need to set up storage policies
- **"Invalid bucket"** → Check bucket name is exactly `avatars`

## Step 2: Verify Bucket Exists

1. Go to your Supabase Dashboard
2. Navigate to **Storage** > **Buckets**
3. Look for a bucket named **`avatars`**
4. If you don't see it, you need to create it (see SETUP_AVATARS.md)

## Step 3: Check Bucket is Public

1. Click on the **avatars** bucket
2. Look at the bucket settings
3. Verify **"Public bucket"** is enabled
4. If not, edit the bucket and toggle it ON

## Step 4: Verify Storage Policies

1. In the **avatars** bucket, go to **Policies** tab
2. You should see 4 policies:
   - "Users can upload their own avatar"
   - "Users can update their own avatar"
   - "Users can delete their own avatar"
   - "Anyone can view avatars"
3. If these are missing, run the SQL in `setup-avatar-storage.sql`

## Step 5: Test in Browser Console

Open browser console and paste this to test:

```javascript
// Test if bucket exists
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// List buckets
const { data, error } = await supabase.storage.listBuckets();
console.log('Buckets:', data);
console.log('Error:', error);

// Check if avatars bucket exists
const avatarsBucket = data?.find(b => b.name === 'avatars');
console.log('Avatars bucket exists:', !!avatarsBucket);
```

## Common Issues & Solutions

### Issue: "Bucket not found"
**Solution**: Create the `avatars` bucket in Supabase Dashboard

### Issue: "Access denied" or "Policy violation"
**Solution**: Run the SQL policies from `setup-avatar-storage.sql`

### Issue: Avatar URL doesn't load after upload
**Solution**: Make sure bucket is **Public** (not Private)

### Issue: Upload works but image broken
**Solution**: Check if the file uploaded to Storage > avatars bucket. If yes, check the public URL.
