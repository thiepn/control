-- P2 incremental schema functions. Requires db/schema.sql + db/p1-app.sql.
-- Repository review ONLY: never apply to a live project without approval.
BEGIN;
CREATE FUNCTION public.control_progress_action(p_owner uuid,p_project uuid,p_action text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_id uuid; v_target uuid; v_before jsonb; v_after jsonb; v_title text;
        v_weight numeric; v_fraction numeric; v_week date; v_phase text;
BEGIN
 IF p_owner IS NULL OR p_project IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object'
 THEN RAISE EXCEPTION 'Invalid input' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text,11));
 IF NOT EXISTS(SELECT 1 FROM public.projects WHERE owner_id=p_owner AND id=p_project AND lifecycle<>'archived')
 THEN RAISE EXCEPTION 'Project unavailable' USING ERRCODE='42501'; END IF;
 IF p_action='target.create' THEN
   v_title := trim(p_payload->>'name');
   IF length(v_title) NOT BETWEEN 1 AND 160 OR length(trim(p_payload->>'definition_of_done')) NOT BETWEEN 1 AND 1000
   THEN RAISE EXCEPTION 'Invalid target' USING ERRCODE='22023'; END IF;
   UPDATE public.project_targets SET is_current=false,state='superseded'
     WHERE owner_id=p_owner AND project_id=p_project AND is_current;
   INSERT INTO public.project_targets(owner_id,project_id,name,definition_of_done,is_current,state)
     VALUES(p_owner,p_project,v_title,trim(p_payload->>'definition_of_done'),true,'approved')
     RETURNING id INTO v_id;
   v_after:=jsonb_build_object('target_id',v_id);
 ELSIF p_action='milestone.create' THEN
   v_target := (p_payload->>'target_id')::uuid;
   IF NOT EXISTS(SELECT 1 FROM public.project_targets
                 WHERE id=v_target AND owner_id=p_owner AND project_id=p_project AND is_current)
   THEN RAISE EXCEPTION 'No current target' USING ERRCODE='42501'; END IF;
   v_title:=trim(p_payload->>'title');
   v_weight:=(p_payload->>'weight')::numeric;
   IF length(v_title) NOT BETWEEN 1 AND 160 OR v_weight<=0 OR v_weight>10000
   THEN RAISE EXCEPTION 'Invalid milestone' USING ERRCODE='22023'; END IF;
   INSERT INTO public.milestones(owner_id,target_id,title,weight,sort_index,
                                 completion_fraction,evidence_grade,release_gate)
   VALUES(p_owner,v_target,v_title,v_weight,
          (SELECT coalesce(max(sort_index),0)+1 FROM public.milestones WHERE owner_id=p_owner AND target_id=v_target),
          0,'unassessed','none') RETURNING id INTO v_id;
   v_after:=jsonb_build_object('milestone_id',v_id);
 ELSIF p_action='milestone.report' THEN
   v_id:=(p_payload->>'milestone_id')::uuid;
   v_fraction:=(p_payload->>'fraction')::numeric;
   IF v_fraction<0 OR v_fraction>1 OR v_fraction IS NULL THEN RAISE EXCEPTION 'Invalid fraction' USING ERRCODE='22023'; END IF;
   SELECT to_jsonb(m) INTO v_before FROM public.milestones m
     JOIN public.project_targets t ON t.id=m.target_id AND t.owner_id=m.owner_id
     WHERE m.id=v_id AND m.owner_id=p_owner AND t.project_id=p_project AND t.is_current FOR UPDATE OF m;
   IF v_before IS NULL THEN RAISE EXCEPTION 'Milestone unavailable' USING ERRCODE='42501'; END IF;
   UPDATE public.milestones SET completion_fraction=v_fraction,
     evidence_grade='user_reported',verified_by=NULL,verified_at=NULL,gate_passed=NULL
     WHERE owner_id=p_owner AND id=v_id;
   v_after:=jsonb_build_object('milestone_id',v_id,'fraction',v_fraction,'grade','user_reported');
 ELSIF p_action='phase.set' THEN
   v_phase:=trim(p_payload->>'phase_key');
   IF v_phase !~ '^P[0-9]{1,3}$' OR length(v_phase)>4
      OR p_payload->>'state' NOT IN ('planned','in_progress','verification','blocked')
   THEN RAISE EXCEPTION 'Invalid phase request' USING ERRCODE='22023'; END IF;
   INSERT INTO public.development_phases(owner_id,project_id,phase_key,title,state,review_needed,notes)
    VALUES(p_owner,p_project,v_phase,left(coalesce(nullif(trim(p_payload->>'title'),''),v_phase),160),
           p_payload->>'state',true,left(coalesce(p_payload->>'notes',''),2000))
    ON CONFLICT(owner_id,project_id,phase_key)
      DO UPDATE SET title=EXCLUDED.title,state=EXCLUDED.state,review_needed=true,notes=EXCLUDED.notes
    RETURNING id INTO v_id;
   v_after:=jsonb_build_object('phase_id',v_id,'state',p_payload->>'state');
 ELSIF p_action='focus.objective' THEN
   v_week:=(p_payload->>'week')::date;
   IF v_week <> date_trunc('week',v_week::timestamp)::date
      OR length(trim(p_payload->>'objective')) NOT BETWEEN 1 AND 500
   THEN RAISE EXCEPTION 'Invalid weekly objective' USING ERRCODE='22023'; END IF;
   UPDATE public.focus_items i SET objective=trim(p_payload->>'objective')
     FROM public.focus_plans f WHERE i.plan_id=f.id AND i.owner_id=p_owner
       AND i.project_id=p_project AND f.owner_id=p_owner AND f.week_start=v_week
     RETURNING i.id INTO v_id;
   IF v_id IS NULL THEN RAISE EXCEPTION 'Focus slot unavailable' USING ERRCODE='42501'; END IF;
   v_after:=jsonb_build_object('focus_item_id',v_id,'objective',trim(p_payload->>'objective'));
 ELSE
   RAISE EXCEPTION 'Unknown action' USING ERRCODE='22023';
 END IF;
 INSERT INTO public.audit_log(owner_id,project_id,actor,action,previous_data,new_data)
   VALUES(p_owner,p_project,'user',p_action,v_before,v_after);
 RETURN v_after;
END $$;
REVOKE ALL ON FUNCTION public.control_progress_action(uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_progress_action(uuid,uuid,text,jsonb) TO service_role;
COMMIT;
