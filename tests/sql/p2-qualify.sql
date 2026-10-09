-- Execute after bootstrap.sql + P0/P1/P2 schemas in runner-local PostgreSQL.
DO $$
DECLARE a uuid:='11111111-1111-4111-8111-111111111111'; b uuid:='22222222-2222-4222-8222-222222222222';
 p public.projects; target_id uuid; ms_id uuid; phase_id uuid; data jsonb; err boolean;
BEGIN
 SELECT * INTO p FROM public.control_mutate_project(a,'create',null,'{"title":"P2 testing","slug":"p2-probe"}',null);
 data:=public.control_progress_action(a,p.id,'target.create',
        '{"name":"Release outcome","definition_of_done":"Reviewed acceptance evidence"}');
 target_id:=(data->>'target_id')::uuid;
 IF NOT EXISTS(SELECT 1 FROM public.project_targets WHERE owner_id=a AND id=target_id AND is_current)
 THEN RAISE EXCEPTION 'target not activated'; END IF;
 data:=public.control_progress_action(a,p.id,'milestone.create',
        jsonb_build_object('target_id',target_id,'title','Unit coverage','weight',3));
 ms_id:=(data->>'milestone_id')::uuid;
 data:=public.control_progress_action(a,p.id,'milestone.report',
        jsonb_build_object('milestone_id',ms_id,'fraction',1));
 IF NOT EXISTS(SELECT 1 FROM public.milestones WHERE id=ms_id AND owner_id=a AND
   evidence_grade='user_reported' AND verified_by IS NULL AND verified_at IS NULL AND completion_fraction=1)
 THEN RAISE EXCEPTION 'user report incorrectly verified'; END IF;
 data:=public.control_progress_action(a,p.id,'phase.set',
        '{"phase_key":"P2","title":"Milestones","state":"in_progress"}');
 phase_id:=(data->>'phase_id')::uuid;
 IF NOT EXISTS(SELECT 1 FROM public.development_phases
              WHERE id=phase_id AND review_needed AND state='in_progress')
 THEN RAISE EXCEPTION 'phase missing or falsely qualified'; END IF;
 err:=false;
 BEGIN
  PERFORM public.control_progress_action(a,p.id,'phase.set',
     '{"phase_key":"P2","state":"released"}');
 EXCEPTION WHEN SQLSTATE '22023' THEN err:=true;
 END;
 IF NOT err THEN RAISE EXCEPTION 'client released a phase without evidence'; END IF;
 err:=false;
 BEGIN
  PERFORM public.control_progress_action(b,p.id,'milestone.report',
   jsonb_build_object('milestone_id',ms_id,'fraction',1));
 EXCEPTION WHEN SQLSTATE '42501' THEN err:=true;
 END;
 IF NOT err THEN RAISE EXCEPTION 'cross-owner milestone update permitted'; END IF;
 PERFORM public.control_replace_focus(a,'2026-10-05',ARRAY[p.id]);
 PERFORM public.control_progress_action(a,p.id,'focus.objective',
  '{"week":"2026-10-05","objective":"Pass P2 qualification"}');
 IF NOT EXISTS(SELECT 1 FROM public.focus_items i
 JOIN public.focus_plans f ON i.plan_id=f.id WHERE i.owner_id=a AND i.project_id=p.id
   AND f.week_start='2026-10-05' AND i.objective='Pass P2 qualification')
 THEN RAISE EXCEPTION 'weekly objective missing'; END IF;
 IF (SELECT count(*) FROM public.audit_log WHERE owner_id=a AND project_id=p.id
     AND action IN ('target.create','milestone.create','milestone.report','phase.set','focus.objective'))<>5
 THEN RAISE EXCEPTION 'missing action audits'; END IF;
END $$;
-- An authenticated user is limited to reading owner data and cannot call the writer.
SET ROLE authenticated;
SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.project_targets WHERE name='Release outcome') THEN
  RAISE EXCEPTION 'cross-owner P2 read leakage'; END IF;
 IF has_function_privilege(current_user,'public.control_progress_action(uuid,uuid,text,jsonb)','EXECUTE') THEN
  RAISE EXCEPTION 'authenticated role can execute writer'; END IF;
END $$;
RESET ROLE;
SELECT 'PASS P2 owner scope, milestone reporting, no false verification, phases, focus and audits' AS result;
