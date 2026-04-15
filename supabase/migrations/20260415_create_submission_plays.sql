-- Create submission_plays table to track meaningful track playback
CREATE TABLE IF NOT EXISTS public.submission_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(submission_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_submission_plays_submission_id
  ON public.submission_plays(submission_id);

CREATE INDEX IF NOT EXISTS idx_submission_plays_user_id
  ON public.submission_plays(user_id);

CREATE INDEX IF NOT EXISTS idx_submission_plays_created_at
  ON public.submission_plays(created_at DESC);

ALTER TABLE public.submission_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Submission plays are publicly readable"
  ON public.submission_plays
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert submission plays"
  ON public.submission_plays
  FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.record_submission_play(
  p_submission_id uuid,
  p_session_id text,
  p_user_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
  current_count integer := 0;
BEGIN
  INSERT INTO public.submission_plays (submission_id, user_id, session_id)
  VALUES (p_submission_id, p_user_id, p_session_id)
  ON CONFLICT (submission_id, session_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count > 0 THEN
    UPDATE public.submissions
    SET play_count = play_count + 1
    WHERE id = p_submission_id
    RETURNING play_count INTO current_count;
  ELSE
    SELECT play_count
    INTO current_count
    FROM public.submissions
    WHERE id = p_submission_id;
  END IF;

  RETURN COALESCE(current_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_submission_play(uuid, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.record_submission_play(uuid, text, uuid) TO authenticated;
