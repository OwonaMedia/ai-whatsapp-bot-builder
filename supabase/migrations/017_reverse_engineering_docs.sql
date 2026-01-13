-- ============================================
-- REVERSE ENGINEERING DOCUMENTATION TABLE
-- ============================================
-- Speichert Reverse Engineering Dokumentation für das Support-System

CREATE TABLE IF NOT EXISTS public.support_reverse_engineering (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('frontend_config', 'api_endpoint', 'env_var', 'database_setting', 'deployment_config', 'payment', 'checkout', 'general')),
  project text NOT NULL DEFAULT 'whatsapp-bot-builder',
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_support_reverse_engineering_category ON public.support_reverse_engineering(category);
CREATE INDEX IF NOT EXISTS idx_support_reverse_engineering_project ON public.support_reverse_engineering(project);
CREATE INDEX IF NOT EXISTS idx_support_reverse_engineering_tags ON public.support_reverse_engineering USING GIN(tags);

-- Update Trigger
CREATE OR REPLACE FUNCTION public.update_support_reverse_engineering_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_support_reverse_engineering_updated_at ON public.support_reverse_engineering;
CREATE TRIGGER trigger_update_support_reverse_engineering_updated_at
  BEFORE UPDATE ON public.support_reverse_engineering
  FOR EACH ROW
  EXECUTE FUNCTION public.update_support_reverse_engineering_updated_at();

-- RLS Policies
ALTER TABLE public.support_reverse_engineering ENABLE ROW LEVEL SECURITY;

-- Service role can manage all documents
CREATE POLICY "Service role can manage all reverse engineering docs"
  ON public.support_reverse_engineering
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK (true);

-- Authenticated users can read all documents
CREATE POLICY "Authenticated users can read reverse engineering docs"
  ON public.support_reverse_engineering
  FOR SELECT
  USING (auth.role() = 'authenticated' OR (auth.jwt() ->> 'role') = 'service_role');

-- Grant permissions
GRANT SELECT ON public.support_reverse_engineering TO authenticated;
GRANT ALL ON public.support_reverse_engineering TO service_role;




