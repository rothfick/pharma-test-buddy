
-- 1. Audit log: restrict SELECT to admin or owner
DROP POLICY IF EXISTS "Authenticated can read audit log" ON public.audit_log;

CREATE POLICY "Admins or owners can read audit log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = user_id);

-- 2. Realtime: scope channel subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users subscribe to own or public channels" ON realtime.messages;
CREATE POLICY "Users subscribe to own or public channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (realtime.topic() LIKE 'public:%')
  OR (realtime.topic() LIKE (auth.uid()::text || ':%'))
  OR (realtime.topic() = auth.uid()::text)
);

DROP POLICY IF EXISTS "Users broadcast to own or public channels" ON realtime.messages;
CREATE POLICY "Users broadcast to own or public channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (realtime.topic() LIKE 'public:%')
  OR (realtime.topic() LIKE (auth.uid()::text || ':%'))
  OR (realtime.topic() = auth.uid()::text)
);

-- 3. Lock down SECURITY DEFINER functions: revoke from anon and PUBLIC
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.feature_spend_today(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.match_semantic_cache(extensions.vector, text, double precision) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.match_rag_chunks(extensions.vector, integer, uuid[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_audit_mutation() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, public, authenticated;
