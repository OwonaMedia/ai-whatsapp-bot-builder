-- ============================================
-- N8N WORKFLOW CHECKPOINTS TABLE
-- Needed for "Save Proposal Checkpoint" node
-- ============================================

CREATE TABLE IF NOT EXISTS public.n8n_workflow_checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id TEXT,
    execution_id TEXT,
    step_name TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.n8n_workflow_checkpoints ENABLE ROW LEVEL SECURITY;

-- Policy to allow all access (adjust if you need stricter security for n8n)
-- Since n8n usually connects with a service role or specific user, 
-- we often need at least one policy if RLS is on.
-- For now, we allow full access to authenticated users and service roles.
CREATE POLICY "Enable all access for authenticated users" ON public.n8n_workflow_checkpoints
    FOR ALL
    TO authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_n8n_checkpoints_workflow_id ON public.n8n_workflow_checkpoints(workflow_id);
CREATE INDEX IF NOT EXISTS idx_n8n_checkpoints_execution_id ON public.n8n_workflow_checkpoints(execution_id);
