-- ============================================================================
-- Workspaces foundation (PR 1)
--
-- Adds shared-workspace support so a Veyra account can be part of one or more
-- shared spaces (e.g. a trio managing a joint TikTok account).
--
-- Guarantees for this migration:
--   * Every existing auth.users row gets a personal workspace called
--     "Espace perso" and is added as its owner + editor member.
--   * Every existing studio_data row is stamped with the owner's personal
--     workspace_id (nullable until backfill, then NOT NULL).
--   * New signups automatically receive a personal workspace via trigger.
--   * RLS on new tables: equal editors (any member may read/write workspace).
--   * studio_data RLS is left untouched in this PR so the current app keeps
--     working with no code changes. PR 2 will extend it to workspace scope.
-- ============================================================================

-- ---------- Tables ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.workspaces (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL DEFAULT 'Espace',
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_personal boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspaces_owner_id_idx ON public.workspaces (owner_id);

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_one_personal_per_owner
  ON public.workspaces (owner_id) WHERE is_personal = true;

CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor')),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS workspace_members_user_id_idx ON public.workspace_members (user_id);

CREATE TABLE IF NOT EXISTS public.workspace_invites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invited_email   text NOT NULL,
  invited_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  responded_at    timestamptz
);

CREATE INDEX IF NOT EXISTS workspace_invites_workspace_id_idx ON public.workspace_invites (workspace_id);
CREATE INDEX IF NOT EXISTS workspace_invites_email_idx ON public.workspace_invites (lower(invited_email));
CREATE INDEX IF NOT EXISTS workspace_invites_user_id_idx ON public.workspace_invites (invited_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_invites_pending_unique
  ON public.workspace_invites (workspace_id, lower(invited_email))
  WHERE status = 'pending';

-- ---------- studio_data workspace scoping ---------------------------------

ALTER TABLE public.studio_data
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS studio_data_workspace_id_idx ON public.studio_data (workspace_id);

-- ---------- Helper: create personal workspace for a user -----------------

CREATE OR REPLACE FUNCTION public.create_personal_workspace(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  SELECT id INTO v_workspace_id
    FROM public.workspaces
   WHERE owner_id = p_user_id AND is_personal = true
   LIMIT 1;

  IF v_workspace_id IS NOT NULL THEN
    RETURN v_workspace_id;
  END IF;

  INSERT INTO public.workspaces (name, owner_id, is_personal)
       VALUES ('Espace perso', p_user_id, true)
    RETURNING id INTO v_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
       VALUES (v_workspace_id, p_user_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN v_workspace_id;
END;
$$;

-- ---------- Backfill personal workspaces for existing users --------------

DO $$
DECLARE
  r RECORD;
  v_workspace_id uuid;
BEGIN
  FOR r IN SELECT id FROM auth.users LOOP
    v_workspace_id := public.create_personal_workspace(r.id);
  END LOOP;
END;
$$;

-- ---------- Backfill studio_data.workspace_id ----------------------------

UPDATE public.studio_data sd
   SET workspace_id = w.id
  FROM public.workspaces w
 WHERE w.owner_id = sd.user_id
   AND w.is_personal = true
   AND sd.workspace_id IS NULL;

-- Enforce NOT NULL now that every row is stamped.
ALTER TABLE public.studio_data
  ALTER COLUMN workspace_id SET NOT NULL;

-- ---------- Trigger: auto-create personal workspace on signup ------------

CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_personal_workspace(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_workspace ON auth.users;
CREATE TRIGGER on_auth_user_created_workspace
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_workspace();

-- ---------- RLS: enable + policies ---------------------------------------

ALTER TABLE public.workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Helper to check membership without policy recursion.
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
     WHERE workspace_id = p_workspace_id AND user_id = p_user_id
  );
$$;

-- workspaces: members can read; only owner can rename/delete; users create for themselves.
DROP POLICY IF EXISTS workspaces_select ON public.workspaces;
CREATE POLICY workspaces_select ON public.workspaces
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(id, auth.uid()));

DROP POLICY IF EXISTS workspaces_insert ON public.workspaces;
CREATE POLICY workspaces_insert ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS workspaces_update ON public.workspaces;
CREATE POLICY workspaces_update ON public.workspaces
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS workspaces_delete ON public.workspaces;
CREATE POLICY workspaces_delete ON public.workspaces
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() AND is_personal = false);

-- workspace_members: members read the roster; owner adds/removes; a member can remove themselves.
DROP POLICY IF EXISTS workspace_members_select ON public.workspace_members;
CREATE POLICY workspace_members_select ON public.workspace_members
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS workspace_members_insert ON public.workspace_members;
CREATE POLICY workspace_members_insert ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
       WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workspace_members_delete ON public.workspace_members;
CREATE POLICY workspace_members_delete ON public.workspace_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
       WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

-- workspace_invites: members of the workspace see them; the invited user sees their own by email/id;
-- owner creates and cancels; invited user can accept/decline (status update).
DROP POLICY IF EXISTS workspace_invites_select ON public.workspace_invites;
CREATE POLICY workspace_invites_select ON public.workspace_invites
  FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR invited_user_id = auth.uid()
    OR lower(invited_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );

DROP POLICY IF EXISTS workspace_invites_insert ON public.workspace_invites;
CREATE POLICY workspace_invites_insert ON public.workspace_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
       WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workspace_invites_update ON public.workspace_invites;
CREATE POLICY workspace_invites_update ON public.workspace_invites
  FOR UPDATE TO authenticated
  USING (
    invited_user_id = auth.uid()
    OR lower(invited_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
       WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    invited_user_id = auth.uid()
    OR lower(invited_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
       WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workspace_invites_delete ON public.workspace_invites;
CREATE POLICY workspace_invites_delete ON public.workspace_invites
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
       WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

-- ---------- updated_at bump on workspaces --------------------------------

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workspaces_touch_updated_at ON public.workspaces;
CREATE TRIGGER workspaces_touch_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
