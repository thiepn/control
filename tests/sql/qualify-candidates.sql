-- Real, runner-local PostgreSQL regression: repository linking respects
-- the lifecycle/ownership rules and never creates evidence for rejected links.
-- Operates as the disposable test DB administrator to inspect internal tables;
-- browser-role and service-only RPC privileges are separately asserted in qualify.sql.
DO $$
DECLARE
  owner_a uuid := '11111111-1111-4111-8111-111111111111';
  owner_b uuid := '22222222-2222-4222-8222-222222222222';
  active_project public.projects;
  archived_project public.projects;
  foreign_project public.projects;
  linked_row public.repository_candidates;
  valid_candidate uuid;
  archived_candidate uuid;
  foreign_candidate uuid;
  rejected boolean := false;
BEGIN
  SELECT * INTO active_project FROM public.control_mutate_project(
    owner_a,'create',NULL,'{"title":"Eligible linking target","slug":"repo-link-eligible"}'::jsonb,NULL
  );
  SELECT * INTO archived_project FROM public.control_mutate_project(
    owner_a,'create',NULL,'{"title":"Archived linking target","slug":"repo-link-archived"}'::jsonb,NULL
  );
  SELECT * INTO foreign_project FROM public.control_mutate_project(
    owner_b,'create',NULL,'{"title":"Other owner target","slug":"repo-link-foreign"}'::jsonb,NULL
  );
  SELECT * INTO archived_project FROM public.control_mutate_project(
    owner_a,'archive',archived_project.id,'{}'::jsonb,archived_project.version
  );

  INSERT INTO public.repository_candidates(owner_id,github_repository_id,full_name)
    VALUES(owner_a,900000001,'thiepn/eligible-repository') RETURNING id INTO valid_candidate;
  INSERT INTO public.repository_candidates(owner_id,github_repository_id,full_name)
    VALUES(owner_a,900000002,'thiepn/archived-repository') RETURNING id INTO archived_candidate;
  INSERT INTO public.repository_candidates(owner_id,github_repository_id,full_name)
    VALUES(owner_a,900000003,'thiepn/foreign-repository') RETURNING id INTO foreign_candidate;

  SELECT * INTO linked_row FROM public.control_review_candidate(owner_a,valid_candidate,'link',active_project.id);
  IF linked_row.review_status<>'linked' OR linked_row.project_id<>active_project.id THEN
    RAISE EXCEPTION 'eligible candidate not linked correctly';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.project_repository_links l
                 JOIN public.github_repositories r ON r.owner_id=l.owner_id AND r.id=l.repository_id
                 WHERE l.owner_id=owner_a AND l.project_id=active_project.id AND r.github_repository_id=900000001)
  THEN RAISE EXCEPTION 'eligible repo link absent'; END IF;

  rejected:=false;
  BEGIN
    PERFORM public.control_review_candidate(owner_a,archived_candidate,'link',archived_project.id);
  EXCEPTION WHEN SQLSTATE '42501' THEN rejected:=true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'archived project accepted new repo link'; END IF;

  rejected:=false;
  BEGIN
    PERFORM public.control_review_candidate(owner_a,foreign_candidate,'link',foreign_project.id);
  EXCEPTION WHEN SQLSTATE '42501' THEN rejected:=true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'cross-owner repo link permitted'; END IF;

  IF (SELECT count(*) FROM public.repository_candidates
      WHERE id IN (archived_candidate,foreign_candidate) AND review_status='pending')<>2
  THEN RAISE EXCEPTION 'rejected links mutated candidate review status'; END IF;
  IF EXISTS (SELECT 1 FROM public.github_repositories
             WHERE owner_id=owner_a AND github_repository_id IN (900000002,900000003))
  THEN RAISE EXCEPTION 'rejected links created repository records'; END IF;
  IF (SELECT count(*) FROM public.audit_log
      WHERE owner_id=owner_a AND project_id=active_project.id AND action='candidate.link')<>1
  THEN RAISE EXCEPTION 'accepted link audit missing'; END IF;
END $$;
SELECT 'PASS: candidate linking rejects archived/cross-owner projects and preserves rejected state' AS qualification;
