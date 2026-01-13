-- Tabelle für Problem-Diagnose-Metriken
CREATE TABLE IF NOT EXISTS problem_diagnosis_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT NOT NULL,
  problem_detected BOOLEAN NOT NULL,
  problem_type TEXT,
  detection_method TEXT, -- 'keyword', 'semantic', 'llm', 'reverse_engineering'
  detection_time INTEGER, -- in milliseconds
  fix_generated BOOLEAN NOT NULL,
  fix_type TEXT,
  fix_generation_time INTEGER, -- in milliseconds
  fix_applied BOOLEAN NOT NULL,
  fix_success BOOLEAN,
  fix_application_time INTEGER, -- in milliseconds
  total_processing_time INTEGER, -- in milliseconds
  post_fix_verification_passed BOOLEAN,
  post_fix_verification_time INTEGER, -- in milliseconds
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für schnelle Abfragen nach Ticket-ID
CREATE INDEX IF NOT EXISTS idx_problem_diagnosis_metrics_ticket_id 
  ON problem_diagnosis_metrics(ticket_id);

-- Index für schnelle Abfragen nach Datum
CREATE INDEX IF NOT EXISTS idx_problem_diagnosis_metrics_created_at 
  ON problem_diagnosis_metrics(created_at);

-- Index für schnelle Abfragen nach Problem-Typ
CREATE INDEX IF NOT EXISTS idx_problem_diagnosis_metrics_problem_type 
  ON problem_diagnosis_metrics(problem_type);

-- RLS Policies (nur Service Role kann schreiben, alle können lesen)
ALTER TABLE problem_diagnosis_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Service Role kann alles
CREATE POLICY "Service role can do everything" ON problem_diagnosis_metrics
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Authentifizierte Benutzer können lesen
CREATE POLICY "Authenticated users can read" ON problem_diagnosis_metrics
  FOR SELECT
  USING (auth.role() = 'authenticated');

