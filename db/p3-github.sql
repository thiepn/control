-- P3 server-only evidence intake. Requires P0/P1/P2 schema. No migrations applied.
BEGIN;
CREATE FUNCTION public.control_ingest_github_event(
 p_repository_id bigint,p_delivery text,p_kind text,p_sha text,p_summary jsonb
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE link_ record; event_id uuid; count_added integer:=0; existing_count integer;
BEGIN
 IF p_repository_id<=0 OR length(p_delivery) NOT BETWEEN 1 AND 180
   OR p_kind NOT IN ('push','pull_request','workflow_run','check_run')
   OR p_sha !~ '^[0-9a-f]{40}$'
   OR jsonb_typeof(p_summary)<>'object' OR octet_length(p_summary::text)>8192
 THEN RAISE EXCEPTION 'Invalid GitHub evidence' USING ERRCODE='22023'; END IF;
 FOR link_ IN
  SELECT l.owner_id,l.project_id,l.repository_id
  FROM public.github_repositories r JOIN public.project_repository_links l
   ON r.owner_id=l.owner_id AND r.id=l.repository_id
  WHERE r.github_repository_id=p_repository_id
 LOOP
  -- An owner may have only one link per repository; the delivery ID is unique for that owner.
  INSERT INTO public.evidence_events(owner_id,repository_id,project_id,provider,provider_event_id,event_type,event_sha,payload)
   VALUES(link_.owner_id,link_.repository_id,link_.project_id,'github',p_delivery,p_kind,p_sha,p_summary)
   ON CONFLICT (owner_id,provider,provider_event_id) DO NOTHING
   RETURNING id INTO event_id;
  IF event_id IS NOT NULL THEN
   count_added:=count_added+1;
   INSERT INTO public.audit_log(owner_id,project_id,actor,action,new_data,source_ref)
    VALUES(link_.owner_id,link_.project_id,'sync','github.evidence.received',
           jsonb_build_object('event_id',event_id,'sha',p_sha,'kind',p_kind),p_delivery);
   -- A completed successful workflow run may only CREATE a review proposal.
   -- It must NEVER set milestone evidence_grade, gate_passed, or phase state.
   IF p_kind='workflow_run' AND p_summary->>'conclusion'='success'
     AND EXISTS (SELECT 1 FROM public.development_phases
                 WHERE owner_id=link_.owner_id AND project_id=link_.project_id AND head_sha=p_sha
                   AND state IN ('in_progress','verification'))
   THEN
    INSERT INTO public.ai_proposals(owner_id,project_id,proposal_type,before_value,proposed_value,
                                   rationale,evidence_event_ids,state)
    VALUES(link_.owner_id,link_.project_id,'phase','{}'::jsonb,
           jsonb_build_object('sha',p_sha,'event_id',event_id,'suggestion','review_qualification'),
           'Successful GitHub run at matching phase head; human review is required',ARRAY[event_id],'pending');
   END IF;
  END IF;
  event_id:=NULL;
 END LOOP;
 RETURN count_added;
END $$;
REVOKE ALL ON FUNCTION public.control_ingest_github_event(bigint,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_ingest_github_event(bigint,text,text,text,jsonb) TO service_role;

CREATE FUNCTION public.control_decide_github_proposal(p_owner uuid,p_proposal uuid,p_decision text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE original public.ai_proposals;
BEGIN
 IF p_owner IS NULL OR p_proposal IS NULL OR p_decision NOT IN ('accepted','rejected')
 THEN RAISE EXCEPTION 'Invalid proposal decision' USING ERRCODE='22023'; END IF;
 SELECT * INTO original FROM public.ai_proposals
   WHERE owner_id=p_owner AND id=p_proposal AND state='pending' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Proposal unavailable' USING ERRCODE='P0002'; END IF;
 UPDATE public.ai_proposals SET state=p_decision,decided_at=now()
 WHERE owner_id=p_owner AND id=p_proposal;
 INSERT INTO public.audit_log(owner_id,project_id,actor,action,previous_data,new_data)
  VALUES(p_owner,original.project_id,'user','github.proposal.'||p_decision,
         to_jsonb(original),jsonb_build_object('state',p_decision,'proposal_id',p_proposal));
 RETURN jsonb_build_object('state',p_decision,'proposal_id',p_proposal,
                           'note','Decision recorded; no progress or release state changed');
END $$;
REVOKE ALL ON FUNCTION public.control_decide_github_proposal(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_decide_github_proposal(uuid,uuid,text) TO service_role;
-- Associate a phase with an already signed and ingested GitHub head.
-- Retroactive successful-run evidence becomes a pending review proposal.
CREATE FUNCTION public.control_track_github_head(
 p_owner uuid,p_project uuid,p_phase text,p_sha text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $
DECLARE v_phase_id uuid; ev record;
BEGIN
 IF p_owner IS NULL OR p_project IS NULL OR p_phase !~ '^P[0-9]{1,3}
    OR p_sha !~ '^[0-9a-f]{40}
 THEN RAISE EXCEPTION 'Invalid head association' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text,11));
 IF NOT EXISTS(SELECT 1 FROM public.evidence_events
   WHERE owner_id=p_owner AND project_id=p_project AND provider='github'
     AND event_sha=p_sha)
 THEN RAISE EXCEPTION 'No signed evidence for this head' USING ERRCODE='42501'; END IF;
 UPDATE public.development_phases SET head_sha=p_sha
  WHERE owner_id=p_owner AND project_id=p_project AND phase_key=p_phase
    AND state IN ('planned','in_progress','verification','blocked')
  RETURNING id INTO v_phase_id;
 IF v_phase_id IS NULL THEN RAISE EXCEPTION 'Phase unavailable' USING ERRCODE='P0002'; END IF;
 FOR ev IN SELECT id FROM public.evidence_events
   WHERE owner_id=p_owner AND project_id=p_project AND provider='github'
   AND event_sha=p_sha AND event_type='workflow_run' AND payload->>'conclusion'='success'
 LOOP
   IF NOT EXISTS(SELECT 1 FROM public.ai_proposals
     WHERE owner_id=p_owner AND project_id=p_project AND proposal_type='phase'
       AND evidence_event_ids @> ARRAY[ev.id])
   THEN
     INSERT INTO public.ai_proposals(owner_id,project_id,proposal_type,before_value,proposed_value,
       rationale,evidence_event_ids,state)
     VALUES(p_owner,p_project,'phase','{}'::jsonb,
       jsonb_build_object('sha',p_sha,'event_id',ev.id,'suggestion','review_qualification'),
       'Successful GitHub run at explicitly tracked phase head; review required',ARRAY[ev.id],'pending');
   END IF;
 END LOOP;
 INSERT INTO public.audit_log(owner_id,project_id,actor,action,new_data)
 VALUES(p_owner,p_project,'user','github.phase.track_head',
   jsonb_build_object('phase_key',p_phase,'head_sha',p_sha));
 RETURN jsonb_build_object('phase_id',v_phase_id,'head_sha',p_sha);
END $;
REVOKE ALL ON FUNCTION public.control_track_github_head(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_track_github_head(uuid,uuid,text,text) TO service_role;

COMMIT;
