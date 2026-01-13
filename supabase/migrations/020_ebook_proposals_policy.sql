-- Enable RLS on ebook_proposals if not already enabled
ALTER TABLE "public"."ebook_proposals" ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to allow all operations
-- This is necessary if n8n connects via Anon Key + Auth or a specific user, rather than Service Role
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ebook_proposals' 
    AND policyname = 'Allow all access for authenticated users'
  ) THEN
    CREATE POLICY "Allow all access for authenticated users" 
    ON "public"."ebook_proposals" 
    AS PERMISSIVE 
    FOR ALL 
    TO "authenticated" 
    USING (true) 
    WITH CHECK (true);
  END IF;
  
  -- Also ensure service_role has access (usually explicit policy is good practice)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ebook_proposals' 
    AND policyname = 'Allow all access for service_role'
  ) THEN
    CREATE POLICY "Allow all access for service_role" 
    ON "public"."ebook_proposals" 
    AS PERMISSIVE 
    FOR ALL 
    TO "service_role" 
    USING (true) 
    WITH CHECK (true);
  END IF;
END $$;
