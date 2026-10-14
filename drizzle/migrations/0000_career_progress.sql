CREATE TABLE public.career_progress (user_id uuid PRIMARY KEY, skills jsonb NOT NULL DEFAULT '{}'::jsonb, milestones jsonb NOT NULL DEFAULT '{}'::jsonb, target_role text, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_progress TO authenticated;
GRANT ALL ON public.career_progress TO service_role;
ALTER TABLE public.career_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own career progress" ON public.career_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);