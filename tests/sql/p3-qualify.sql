-- Runner-local PostgreSQL: exact-head evidence, tenant isolation, replay and proposal decisions.
DO $$
DECLARE a uuid:='11111111-1111-4111-8111-111111111111'; b uuid:='22222222-2222-4222-8222-222222222222';
 p public.projects; phase_id uuid; repo_id uuid; proposal_id uuid; count_new int;
 sha text:=repeat('a',40);
BEGIN
 SELECT * INTO p FROM public.control_mutate_project(a,'create',null,'{"title":"P3 test","slug":"p3-repo"}'::jsonb,null);
 INSERT INTO public.github_repositories(owner_id,github_repository_id,full_name)
 VALUES(a,777001,'thiepn/test-p3') RETURNING id INTO repo_id;
 INSERT INTO public.project_repository_links(owner_id,project_id,repository_id)
 VALUES(a,p.id,repo_id);
 INSERT INTO public.development_phases(owner_id,project_id,phase_key,state,head_sha)
 VALUES(a,p.id,'P3','verification',sha) RETURNING id INTO phase_id;
 count_new:=public.control_ingest_github_event(777001,'webhook:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
       'workflow_run',sha,'{"conclusion":"success","external_id":44}'::jsonb);
 IF count_new<>1 THEN RAISE EXCEPTION 'valid event not persisted'; END IF;
 count_new:=public.control_ingest_github_event(777001,'webhook:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
       'workflow_run',sha,'{"conclusion":"success","external_id":44}'::jsonb);
 IF count_new<>0 THEN RAISE EXCEPTION 'webhook replay was not deduplicated'; END IF;
 SELECT id INTO proposal_id FROM public.ai_proposals WHERE owner_id=a AND project_id=p.id
    AND state='pending' AND proposal_type='phase';
 IF proposal_id IS NULL THEN RAISE EXCEPTION 'exact-head CI review proposal missing'; END IF;
 IF (SELECT count(*) FROM public.ai_proposals WHERE owner_id=a AND project_id=p.id)<>1
 THEN RAISE EXCEPTION 'replay created duplicate proposal'; END IF;
 IF EXISTS(SELECT 1 FROM public.development_phases WHERE id=phase_id AND state='qualified')
 THEN RAISE EXCEPTION 'webhook illegally qualified phase'; END IF;
 PERFORM public.control_decide_github_proposal(a,proposal_id,'accepted');
 IF NOT EXISTS(SELECT 1 FROM public.ai_proposals WHERE id=proposal_id AND state='accepted')
 THEN RAISE EXCEPTION 'proposal decision not persisted'; END IF;
 IF EXISTS(SELECT 1 FROM public.development_phases WHERE id=phase_id AND state='qualified')
 THEN RAISE EXCEPTION 'acknowledgment improperly changed phase'; END IF;
 IF EXISTS(SELECT 1 FROM public.evidence_events WHERE owner_id=b AND provider_event_id='webhook:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')
 THEN RAISE EXCEPTION 'cross-owner evidence leak'; END IF;
END $$;
SET ROLE authenticated;
SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.evidence_events WHERE provider_event_id LIKE 'webhook:%')
 THEN RAISE EXCEPTION 'other owner can read evidence'; END IF;
 IF has_function_privilege(current_user,'public.control_ingest_github_event(bigint,text,text,text,jsonb)','EXECUTE')
 THEN RAISE EXCEPTION 'browser may ingest evidence'; END IF;
END $$;
RESET ROLE;
SELECT 'PASS: P3 signed-source normalization, server-only evidence, replay, proposals, tenant isolation' AS qualification;
