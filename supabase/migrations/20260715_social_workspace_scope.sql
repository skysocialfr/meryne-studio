-- ============================================================================
-- Social connections scoped per workspace
--
-- Before this migration, Instagram/TikTok/LinkedIn connections were attached
-- to a user (user_id). This meant that when Meryne connected @meryne.eis on
-- her personal workspace, the same connection was visible in her shared
-- trio workspace too — but the trio has its own Instagram account
-- (@trio_tiktok). The fix: attach every connection to a workspace, so each
-- space can hold its own set of accounts.
-- ============================================================================

-- 1. Add workspace_id, backfill to owner's personal workspace, then require it
ALTER TABLE public.social_connections
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.social_connections sc
   SET workspace_id = w.id
  FROM public.workspaces w
 WHERE w.owner_id = sc.user_id
   AND w.is_personal = true
   AND sc.workspace_id IS NULL;

-- Any leftover unattached row (should be none) stays nullable for safety.
CREATE INDEX IF NOT EXISTS social_connections_workspace_id_idx
  ON public.social_connections (workspace_id);

-- 2. Move the "one account per platform" uniqueness from user to workspace.
DO $$
DECLARE
  cnstr text;
BEGIN
  FOR cnstr IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.social_connections'::regclass
       AND contype = 'u'
       AND pg_get_constraintdef(oid) LIKE '%user_id%platform%account_id%'
  LOOP
    EXECUTE 'ALTER TABLE public.social_connections DROP CONSTRAINT ' || quote_ident(cnstr);
  END LOOP;
END $$;

-- Drop any pre-existing unique indexes that would block the new key
DROP INDEX IF EXISTS social_connections_user_id_platform_account_id_key;
DROP INDEX IF EXISTS social_connections_user_platform_account_key;

-- New uniqueness: one connection per (workspace, platform, account).
CREATE UNIQUE INDEX IF NOT EXISTS social_connections_ws_platform_account_key
  ON public.social_connections (workspace_id, platform, account_id);

-- 3. RLS — additive: workspace members can read/write connections in their
-- workspace. Legacy per-user policies are preserved so nothing breaks during
-- the transition.
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_connections_ws_select ON public.social_connections;
CREATE POLICY social_connections_ws_select ON public.social_connections
  FOR SELECT TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.is_workspace_member(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS social_connections_ws_insert ON public.social_connections;
CREATE POLICY social_connections_ws_insert ON public.social_connections
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IS NOT NULL
    AND public.is_workspace_member(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS social_connections_ws_update ON public.social_connections;
CREATE POLICY social_connections_ws_update ON public.social_connections
  FOR UPDATE TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.is_workspace_member(workspace_id, auth.uid())
  )
  WITH CHECK (
    workspace_id IS NOT NULL
    AND public.is_workspace_member(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS social_connections_ws_delete ON public.social_connections;
CREATE POLICY social_connections_ws_delete ON public.social_connections
  FOR DELETE TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.is_workspace_member(workspace_id, auth.uid())
  );
