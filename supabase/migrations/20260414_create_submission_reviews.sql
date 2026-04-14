-- Create submission_reviews table to track user swipe actions
CREATE TABLE IF NOT EXISTS public.submission_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('liked', 'skipped')),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure one review per user per submission
  UNIQUE(user_id, submission_id)
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_submission_reviews_user_id 
  ON public.submission_reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_submission_reviews_submission_id 
  ON public.submission_reviews(submission_id);

CREATE INDEX IF NOT EXISTS idx_submission_reviews_user_submission 
  ON public.submission_reviews(user_id, submission_id);

-- Enable RLS
ALTER TABLE public.submission_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own reviews
CREATE POLICY "Users can insert their own reviews"
  ON public.submission_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own reviews
CREATE POLICY "Users can view their own reviews"
  ON public.submission_reviews
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
  ON public.submission_reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Anyone can view review counts (for analytics)
CREATE POLICY "Anyone can view review counts"
  ON public.submission_reviews
  FOR SELECT
  TO authenticated
  USING (true);
