-- Real PostgreSQL assertions against an ephemeral CI container.
-- Separate from the mandatory REAL Supabase/Auth two-user acceptance gate.
SET ROLE service_role;
DO $$
DECLARE p public.projects; updated public.projects; rejected boolean := false;
BEGIN
  SELECT * INTO p FROM public.control_mutate_project('11111111-1111-4111-8111-111111111111','create',NULL,
    '{"title":"Alpha","slug":"rls-alpha"}'::jsonb,NULL);
  IF p.owner_id <> '11111111-1111-4111-8111-111111111111' OR p.version <> 1 THEN
    RAISE EXCEPTION 'alpha create failure';
  END IF;
  SELECT * INTO updated FROM public.control_mutate_project('11111111-1111-4111-8111-111111111111','update',p.id,
    '{"next_action":"Reviewed"}'::jsonb,p.version);
  IF updated.version <> 2 THEN RAISE EXCEPTION 'optimistic update failure'; END IF;
  BEGIN
    PERFORM public.control_mutate_project('11111111-1111-4111-8111-111111111111','update',p.id,
      '{"title":"Stale"}'::jsonb,p.version);
  EXCEPTION WHEN SQLSTATE 'P0002' THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'stale update was allowed'; END IF;
  rejected := false;
  BEGIN
    PERFORM public.control_replace_focus('11111111-1111-4111-8111-111111111111','2026-10-05',
      ARRAY['33333333-3333-4333-8333-333333333333'::uuid,'44444444-4444-4444-8444-444444444444'::uuid,
            '55555555-5555-4555-8555-555555555555'::uuid,'66666666-6666-4666-8666-666666666666'::uuid]);
  EXCEPTION WHEN SQLSTATE '22023' THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'fourth focus slot was allowed'; END IF;
END $$;
SELECT public.control_mutate_project('22222222-2222-4222-8222-222222222222','create',NULL,
  '{"title":"Beta","slug":"rls-beta"}'::jsonb,NULL);
RESET ROLE;

SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.projects;
 IF n<>1 THEN RAISE EXCEPTION 'owner A must see exactly one project, got %',n; END IF;
 SELECT count(*) INTO n FROM public.audit_log;
 IF n<>2 THEN RAISE EXCEPTION 'owner A audit not visible, got %',n; END IF;
 IF has_table_privilege(current_user,'public.projects','INSERT')
    OR has_table_privilege(current_user,'public.audit_log','INSERT')
    OR has_function_privilege(current_user,'public.control_mutate_project(uuid,text,uuid,jsonb,bigint)','EXECUTE')
 THEN RAISE EXCEPTION 'browser role has mutation capability'; END IF;
END $$;
SET request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.projects;
 IF n<>1 THEN RAISE EXCEPTION 'owner B sees owner A data, count %',n; END IF;
 SELECT count(*) INTO n FROM public.audit_log;
 IF n<>1 THEN RAISE EXCEPTION 'owner B audit isolation failed, count %',n; END IF;
END $$;
RESET ROLE;
SET ROLE anon;
DO $$
BEGIN
 IF has_table_privilege(current_user,'public.projects','SELECT')
    OR has_table_privilege(current_user,'public.audit_log','SELECT')
 THEN RAISE EXCEPTION 'anonymous browser access granted'; END IF;
END $$;
RESET ROLE;
-- Live PostgreSQL regression: archived projects must not remain in focus,
-- whether archived via a lifecycle update or through the archive action.
SET ROLE service_role;
DO $
DECLARE
  p public.projects;
  changed public.projects;
  rejected boolean;
  action_name text;
  i integer := 0;
BEGIN
  FOREACH action_name IN ARRAY ARRAY['update','archive'] LOOP
    i := i + 1;
    SELECT * INTO p FROM public.control_mutate_project(
      '11111111-1111-4111-8111-111111111111', 'create', NULL,
      jsonb_build_object('title','Archive focus test ' || i,'slug','archive-focus-' || i), NULL
    );
    PERFORM public.control_replace_focus(
      '11111111-1111-4111-8111-111111111111', '2026-10-05', ARRAY[p.id]
    );
    IF NOT EXISTS (SELECT 1 FROM public.focus_items
                   WHERE owner_id=p.owner_id AND project_id=p.id) THEN
      RAISE EXCEPTION 'precondition: focus not assigned';
    END IF;
    SELECT * INTO changed FROM public.control_mutate_project(
      p.owner_id, action_name, p.id,
      CASE WHEN action_name='update' THEN '{"lifecycle":"archived"}'::jsonb ELSE '{}'::jsonb END,
      p.version
    );
    IF changed.lifecycle <> 'archived' OR EXISTS
      (SELECT 1 FROM public.focus_items WHERE owner_id=p.owner_id AND project_id=p.id) THEN
      RAISE EXCEPTION 'archived project remains in focus via %', action_name;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.audit_log
      WHERE owner_id=p.owner_id AND project_id=p.id AND actor='system'
        AND action='focus.remove_archived') THEN
      RAISE EXCEPTION 'focus eviction was not audited via %', action_name;
    END IF;
    rejected := false;
    BEGIN
      PERFORM public.control_replace_focus(
        p.owner_id, '2026-10-05', ARRAY[p.id]
      );
    EXCEPTION WHEN SQLSTATE '42501' THEN rejected := true;
    END;
    IF NOT rejected THEN RAISE EXCEPTION 'archived project reinserted in focus'; END IF;
  END LOOP;
END $;
RESET ROLE;
SELECT 'PASS: ephemeral PostgreSQL RLS, owner isolation, service-only mutation, audited write, stale conflict, focus cap, archive-focus eviction' AS qualification;
