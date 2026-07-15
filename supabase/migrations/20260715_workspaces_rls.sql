-- ============================================================================
-- Workspaces PR 2 — studio_data RLS becomes workspace-aware
--
-- Additive change: the existing per-user policy (key prefix = auth.uid()) is
-- preserved so legacy personal-workspace rows keep working exactly as before.
-- We ADD a second permissive policy that grants access to any row whose
-- workspace_id names a workspace the caller is a member of. Postgres OR's
-- permissive policies, so shared-workspace rows become accessible without
-- weakening legacy isolation.
-- ============================================================================

ALTER TABLE public.studio_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS studio_data_workspace_select ON public.studio_data;
CREATE POLICY studio_data_workspace_select ON public.studio_data
  FOR SELECT TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.is_workspace_member(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS studio_data_workspace_insert ON public.studio_data;
CREATE POLICY studio_data_workspace_insert ON public.studio_data
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IS NOT NULL
    AND public.is_workspace_member(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS studio_data_workspace_update ON public.studio_data;
CREATE POLICY studio_data_workspace_update ON public.studio_data
  FOR UPDATE TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.is_workspace_member(workspace_id, auth.uid())
  )
  WITH CHECK (
    workspace_id IS NOT NULL
    AND public.is_workspace_member(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS studio_data_workspace_delete ON public.studio_data;
CREATE POLICY studio_data_workspace_delete ON public.studio_data
  FOR DELETE TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.is_workspace_member(workspace_id, auth.uid())
  );

-- RPC: accept a pending invite. Adds the caller to workspace_members and
-- marks the invite accepted. SECURITY DEFINER so the client can call it
-- without holding INSERT rights on workspace_members directly.
CREATE OR REPLACE FUNCTION public.accept_workspace_invite(p_invite_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite   public.workspace_invites%ROWTYPE;
  v_email    text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO v_invite
    FROM public.workspace_invites
   WHERE id = p_invite_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'Invite already %', v_invite.status;
  END IF;

  IF v_invite.expires_at < now() THEN
    UPDATE public.workspace_invites
       SET status = 'expired', responded_at = now()
     WHERE id = p_invite_id;
    RAISE EXCEPTION 'Invite expired';
  END IF;

  IF v_invite.invited_user_id IS NOT NULL AND v_invite.invited_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Invite is for another user';
  END IF;

  IF v_invite.invited_user_id IS NULL AND lower(v_invite.invited_email) <> lower(coalesce(v_email, '')) THEN
    RAISE EXCEPTION 'Invite email does not match';
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
       VALUES (v_invite.workspace_id, auth.uid(), 'editor')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  UPDATE public.workspace_invites
     SET status = 'accepted', responded_at = now(), invited_user_id = auth.uid()
   WHERE id = p_invite_id;

  RETURN v_invite.workspace_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_workspace_invite(uuid) TO authenticated;

-- RPC: decline a pending invite.
CREATE OR REPLACE FUNCTION public.decline_workspace_invite(p_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_invite public.workspace_invites%ROWTYPE;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO v_invite FROM public.workspace_invites WHERE id = p_invite_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
  IF v_invite.status <> 'pending' THEN
    RETURN;
  END IF;
  IF v_invite.invited_user_id IS NOT NULL AND v_invite.invited_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Invite is for another user';
  END IF;
  IF v_invite.invited_user_id IS NULL AND lower(v_invite.invited_email) <> lower(coalesce(v_email, '')) THEN
    RAISE EXCEPTION 'Invite email does not match';
  END IF;

  UPDATE public.workspace_invites
     SET status = 'declined', responded_at = now()
   WHERE id = p_invite_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decline_workspace_invite(uuid) TO authenticated;

-- Function: my_workspaces — the workspaces the caller belongs to. SECURITY
-- DEFINER so it bypasses table-level RLS (which restricts to members) and
-- can compute member_count reliably.
DROP VIEW IF EXISTS public.my_workspaces;
CREATE OR REPLACE FUNCTION public.my_workspaces()
RETURNS TABLE(
  id uuid,
  name text,
  owner_id uuid,
  is_personal boolean,
  created_at timestamptz,
  member_count int,
  my_role text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id, w.name, w.owner_id, w.is_personal, w.created_at,
         (SELECT count(*)::int FROM public.workspace_members m WHERE m.workspace_id = w.id) AS member_count,
         (SELECT role FROM public.workspace_members m WHERE m.workspace_id = w.id AND m.user_id = auth.uid()) AS my_role
    FROM public.workspaces w
   WHERE public.is_workspace_member(w.id, auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.my_workspaces() TO authenticated;
-- Also expose it as a view so `sb.from('my_workspaces').select('*')` works.
CREATE OR REPLACE VIEW public.my_workspaces AS
SELECT * FROM public.my_workspaces();
GRANT SELECT ON public.my_workspaces TO authenticated;

-- Function + view: my_pending_invites — pending invites for the caller
-- (matched by invited_user_id OR by email). SECURITY DEFINER so it can
-- resolve the workspace name (RLS restricts to members) and the inviter's
-- display name (RLS restricts to owner) reliably.
DROP VIEW IF EXISTS public.my_pending_invites;
CREATE OR REPLACE FUNCTION public.my_pending_invites()
RETURNS TABLE(
  id uuid,
  workspace_id uuid,
  workspace_name text,
  invited_email text,
  invited_by uuid,
  invited_by_email text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id,
         i.workspace_id,
         w.name AS workspace_name,
         i.invited_email,
         i.invited_by,
         coalesce(nullif(p.display_name, ''), p.email) AS invited_by_email,
         i.created_at,
         i.expires_at
    FROM public.workspace_invites i
    JOIN public.workspaces w        ON w.id = i.workspace_id
    LEFT JOIN public.profiles p     ON p.id = i.invited_by
   WHERE i.status = 'pending'
     AND i.expires_at > now()
     AND (
          i.invited_user_id = auth.uid()
       OR lower(i.invited_email) = lower(coalesce((SELECT email FROM auth.users WHERE id = auth.uid()), ''))
     );
$$;
GRANT EXECUTE ON FUNCTION public.my_pending_invites() TO authenticated;
CREATE OR REPLACE VIEW public.my_pending_invites AS
SELECT * FROM public.my_pending_invites();
GRANT SELECT ON public.my_pending_invites TO authenticated;

GRANT SELECT ON public.my_pending_invites TO authenticated;

-- RPC: create an invite. Requires the caller to own the workspace and the
-- invited email to belong to an existing Veyra account (per product spec:
-- "Compte existant obligatoire"). Returns the invite row.
CREATE OR REPLACE FUNCTION public.create_workspace_invite(
  p_workspace_id uuid,
  p_email text
)
RETURNS public.workspace_invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email       text := lower(trim(p_email));
  v_target_id   uuid;
  v_workspace   public.workspaces%ROWTYPE;
  v_invite      public.workspace_invites%ROWTYPE;
BEGIN
  IF v_email = '' OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Email invalide';
  END IF;

  SELECT * INTO v_workspace FROM public.workspaces WHERE id = p_workspace_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Espace introuvable';
  END IF;
  IF v_workspace.owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Seul le propriétaire peut inviter';
  END IF;
  IF v_workspace.is_personal THEN
    RAISE EXCEPTION 'Impossible d''inviter dans un espace personnel';
  END IF;

  SELECT id INTO v_target_id FROM public.profiles WHERE lower(email) = v_email LIMIT 1;
  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Aucun compte Veyra pour cet email — la personne doit d''abord créer un compte';
  END IF;

  IF v_target_id = auth.uid() THEN
    RAISE EXCEPTION 'Tu ne peux pas t''inviter toi-même';
  END IF;

  IF EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = p_workspace_id AND user_id = v_target_id) THEN
    RAISE EXCEPTION 'Cette personne fait déjà partie de l''espace';
  END IF;

  -- Cancel any prior pending invite for this workspace+email so we can reissue.
  UPDATE public.workspace_invites
     SET status = 'cancelled', responded_at = now()
   WHERE workspace_id = p_workspace_id
     AND lower(invited_email) = v_email
     AND status = 'pending';

  INSERT INTO public.workspace_invites (workspace_id, invited_email, invited_by, invited_user_id)
       VALUES (p_workspace_id, v_email, auth.uid(), v_target_id)
    RETURNING * INTO v_invite;

  RETURN v_invite;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_workspace_invite(uuid, text) TO authenticated;

-- Function + view: workspace_members_with_profile — roster with display info,
-- restricted to workspaces the caller is a member of. SECURITY DEFINER so
-- it can read profile rows RLS would otherwise hide.
DROP VIEW IF EXISTS public.workspace_members_with_profile;
CREATE OR REPLACE FUNCTION public.workspace_members_with_profile()
RETURNS TABLE(
  workspace_id uuid,
  user_id uuid,
  role text,
  joined_at timestamptz,
  email text,
  display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.workspace_id,
         m.user_id,
         m.role,
         m.joined_at,
         p.email,
         p.display_name
    FROM public.workspace_members m
    JOIN public.profiles p ON p.id = m.user_id
   WHERE public.is_workspace_member(m.workspace_id, auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.workspace_members_with_profile() TO authenticated;
CREATE OR REPLACE VIEW public.workspace_members_with_profile AS
SELECT * FROM public.workspace_members_with_profile();
GRANT SELECT ON public.workspace_members_with_profile TO authenticated;
