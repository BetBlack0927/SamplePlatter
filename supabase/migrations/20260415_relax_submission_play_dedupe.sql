-- Relax overly-strict play dedupe (was one play forever per session).
-- New rule: count a play after 3s playback, but only once per 60s cooldown
-- per submission + user (authenticated) or submission + session (anonymous).

ALTER TABLE public.submission_plays
  DROP CONSTRAINT IF EXISTS submission_plays_submission_id_session_id_key;

CREATE INDEX IF NOT EXISTS idx_submission_plays_submission_session_created
  ON public.submission_plays(submission_id, session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_submission_plays_submission_user_created
  ON public.submission_plays(submission_id, user_id, created_at DESC);

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
  current_count integer := 0;
  should_insert boolean := true;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT NOT EXISTS (
      SELECT 1
      FROM public.submission_plays
      WHERE submission_id = p_submission_id
        AND user_id = p_user_id
        AND created_at >= now() - interval '60 seconds'
    )
    INTO should_insert;
  ELSE
    SELECT NOT EXISTS (
      SELECT 1
      FROM public.submission_plays
      WHERE submission_id = p_submission_id
        AND session_id = p_session_id
        AND created_at >= now() - interval '60 seconds'
    )
    INTO should_insert;
  END IF;

  IF should_insert THEN
    INSERT INTO public.submission_plays (submission_id, user_id, session_id)
    VALUES (p_submission_id, p_user_id, p_session_id);

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
