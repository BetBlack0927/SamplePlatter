-- Add or update today's sample
-- Replace the values below with your sample details

INSERT INTO public.samples (
  title,
  artist,
  bpm,
  key,
  tags,
  audio_url,
  storage_path,
  active_date,
  created_by
)
VALUES (
  'ESCAPE',  -- Sample title
  'INNER BEATS',  -- Artist name
  128,  -- BPM (or NULL if unknown)
  'Am',  -- Key (or NULL if unknown)
  ARRAY['trap', 'freestyle', 'hard']::text[],  -- Tags
  'https://rxryfhemquvqvtxerogs.supabase.co/storage/v1/object/public/Samples/ESCAPE%20Trap%20Type%20Beat%20Freestyle%20Beat%20Type%20Beat%20Hard%20Type%20Beat%20Rap%20Type%20Beat%202026%20-%20INNER%20BEATS%20(128k).mp3',
  'ESCAPE%20Trap%20Type%20Beat%20Freestyle%20Beat%20Type%20Beat%20Hard%20Type%20Beat%20Rap%20Type%20Beat%202026%20-%20INNER%20BEATS%20(128k).mp3',
  CURRENT_DATE,  -- Today's date
  (SELECT id FROM auth.users LIMIT 1)  -- Uses first user as creator, or replace with specific user ID
)
ON CONFLICT (active_date) 
DO UPDATE SET
  title = EXCLUDED.title,
  artist = EXCLUDED.artist,
  bpm = EXCLUDED.bpm,
  key = EXCLUDED.key,
  tags = EXCLUDED.tags,
  audio_url = EXCLUDED.audio_url,
  storage_path = EXCLUDED.storage_path;

-- Verify it worked
SELECT * FROM public.samples WHERE active_date = CURRENT_DATE;
