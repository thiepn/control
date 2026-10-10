-- C2 isolated PostgreSQL: no auto-generated projects; two repositories may be
-- explicitly grouped under one owner project; other owners cannot view links.
DO $$
DECLARE a uuid:='11111111-1111-4111-8111-111111111111';
        b uuid:='22222222-2222-4222-8222-222222222222';
        project_a public.projects;
        x uuid;y uuid;
        count_before integer;
        rejected boolean:=false;
BEGIN
 SELECT count(*) INTO count_before FROM public.projects WHERE owner_id=a;
 PERFORM public.control_intake_candidates(a,'[
  {"full_name":"thiepn/c2-app","github_repository_id":920010001},
  {"full_name":"thiepn/c2-docs","github_repository_id":920010002},
  {"full_name":"thiepn/c2-app","github_repository_id":920010001}
 ]'::jsonb);
 IF (SELECT count(*) FROM public.repository_candidates WHERE owner_id=a AND github_repository_id IN (920010001,920010002))<>2
  THEN RAISE EXCEPTION 'bulk intake idempotence failed';END IF;
 IF (SELECT count(*) FROM public.projects WHERE owner_id=a)<>count_before
  THEN RAISE EXCEPTION 'bulk intake created a project without owner decision';END IF;
 SELECT id INTO x FROM public.repository_candidates WHERE owner_id=a AND github_repository_id=920010001;
 SELECT id INTO y FROM public.repository_candidates WHERE owner_id=a AND github_repository_id=920010002;
 SELECT * INTO project_a FROM public.control_mutate_project(a,'create',NULL,
  '{"title":"C2 grouping test","slug":"c2-grouping-test","lifecycle":"inbox"}',NULL);
 PERFORM public.control_review_candidate(a,x,'link',project_a.id);
 PERFORM public.control_review_candidate(a,y,'link',project_a.id);
 IF (SELECT count(*) FROM public.project_repository_links WHERE owner_id=a AND project_id=project_a.id)<>2
  THEN RAISE EXCEPTION 'multiple repositories not grouped under one project';END IF;
 IF (SELECT count(*) FROM public.projects WHERE owner_id=a)<>count_before+1
  THEN RAISE EXCEPTION 'link silently created additional project';END IF;
 IF EXISTS(SELECT 1 FROM public.repository_candidates WHERE id IN (x,y)
   AND (review_status<>'linked' OR project_id<>project_a.id))
  THEN RAISE EXCEPTION 'candidate link state mismatch';END IF;
 -- Real RLS check as authenticated non-owner (not service role).
 PERFORM set_config('request.jwt.claim.sub',b::text,true);
 SET LOCAL ROLE authenticated;
 IF EXISTS (SELECT 1 FROM public.project_repository_links WHERE project_id=project_a.id)
  THEN RAISE EXCEPTION 'cross-owner link visible';END IF;
 IF EXISTS (SELECT 1 FROM public.repository_candidates WHERE id IN (x,y))
  THEN RAISE EXCEPTION 'cross-owner intake visible';END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claim.sub','',true);
END $$;
SELECT 'PASS: owner-scoped bulk intake, explicit many-repos-to-one-project grouping and RLS' AS result;
