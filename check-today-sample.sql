-- Check if today's sample exists
SELECT * FROM public.samples WHERE active_date = CURRENT_DATE;

-- Check all samples (to see what dates exist)
SELECT id, title, artist, active_date, created_at 
FROM public.samples 
ORDER BY active_date DESC 
LIMIT 10;

-- Check if there's a unique constraint on active_date
-- (there should be to prevent duplicate daily samples)
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.samples'::regclass 
AND contype IN ('u', 'p');
