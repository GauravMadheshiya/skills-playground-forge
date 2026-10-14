CREATE TABLE IF NOT EXISTS public.career_progress (
  user_id uuid PRIMARY KEY,
  skills jsonb NOT NULL DEFAULT '{}'::jsonb,
  milestones jsonb NOT NULL DEFAULT '{}'::jsonb,
  target_role text DEFAULT 'full-stack',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_progress TO authenticated;
GRANT ALL ON public.career_progress TO service_role;
ALTER TABLE public.career_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own progress select" ON public.career_progress;
DROP POLICY IF EXISTS "Own progress insert" ON public.career_progress;
DROP POLICY IF EXISTS "Own progress update" ON public.career_progress;
DROP POLICY IF EXISTS "Own progress delete" ON public.career_progress;
CREATE POLICY "Own progress select" ON public.career_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own progress insert" ON public.career_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own progress update" ON public.career_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own progress delete" ON public.career_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);