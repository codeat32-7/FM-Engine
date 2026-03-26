-- FM Engine: requesters RLS + sr_messages integrity + org query indexes
-- Applied to project via Supabase MCP (keep this file in sync with remote).

-- Requesters: RLS was disabled (Supabase security linter ERROR)
ALTER TABLE public.requesters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requesters_public_access" ON public.requesters;
CREATE POLICY "requesters_public_access"
  ON public.requesters
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "requesters_public_access" ON public.requesters IS
  'Full access for PostgREST anon until Auth + org-scoped RLS is implemented.';

-- Every message row must belong to a work order
ALTER TABLE public.sr_messages
  ALTER COLUMN sr_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_requests_org_created
  ON public.service_requests (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_requests_org_status
  ON public.service_requests (org_id, status);

CREATE INDEX IF NOT EXISTS idx_requesters_org_pending
  ON public.requesters (org_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_sr_messages_sr_created
  ON public.sr_messages (sr_id, created_at);

CREATE INDEX IF NOT EXISTS idx_profiles_org_phone
  ON public.profiles (org_id, phone);

CREATE INDEX IF NOT EXISTS idx_tenants_org_site
  ON public.tenants (org_id, site_id);
