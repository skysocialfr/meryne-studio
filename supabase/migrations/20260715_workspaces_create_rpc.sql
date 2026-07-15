-- ============================================================================
-- Workspaces PR 2 fix — atomic create_workspace RPC
--
-- The direct INSERT flow (INSERT workspaces RETURNING → INSERT workspace_members)
-- fails on RLS because the SELECT policy on workspaces requires membership,
-- and the caller isn't a member yet at RETURNING time. This RPC creates both
-- rows atomically as SECURITY DEFINER so RLS never sees the transient state.
--
-- Also broadens the workspaces_select policy so an owner always sees their
-- own workspaces (defense in depth — the RPC still works even if a future
-- change reintroduces the direct-INSERT flow).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_workspace(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id   uuid;
  v_name text := trim(coalesce(p_name, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_name = '' THEN
    RAISE EXCEPTION 'Nom requis';
  END IF;
  IF length(v_name) > 60 THEN
    v_name := substring(v_name FROM 1 FOR 60);
  END IF;

  INSERT INTO public.workspaces (name, owner_id, is_personal)
       VALUES (v_name, auth.uid(), false)
    RETURNING id INTO v_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
       VALUES (v_id, auth.uid(), 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_workspace(text) TO authenticated;

-- Broaden SELECT so an owner sees their workspace even before the member row
-- exists (transient state during INSERT flows).
DROP POLICY IF EXISTS workspaces_select ON public.workspaces;
CREATE POLICY workspaces_select ON public.workspaces
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_workspace_member(id, auth.uid())
  );
