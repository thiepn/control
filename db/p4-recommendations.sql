-- P4 isolated review migration. Apply ONLY to a separately authorized environment.
-- A deterministic, version-scoped advisory queue; never claim a model generated the advice.
BEGIN;
CREATE TABLE public.control_recommendations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL,
 project_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('priority','focus','blocker')),
 fingerprint text NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
 source_version bigint NOT NULL CHECK(source_version>0),
 engine text NOT NULL DEFAULT 'p4-rules-1' CHECK(engine='p4-rules-1'),
 score integer NOT NULL CHECK(score BETWEEN 0 AND 100),
 details jsonb NOT NULL CHECK(jsonb_typeof(details)='object'),
 proposed jsonb NOT NULL CHECK(jsonb_typeof(proposed)='object'),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','accepted','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 decided_at timestamptz,
 UNIQUE(owner_id,id),UNIQUE(owner_id,project_id,kind,fingerprint),
 FOREIGN KEY(owner_id,project_id) REFERENCES public.projects(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE public.control_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY p4_owner_read ON public.control_recommendations FOR SELECT TO authenticated
 USING((select auth.uid())=owner_id);
REVOKE ALL ON public.control_recommendations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.control_recommendations TO authenticated;

CREATE FUNCTION public.control_p4_prepare(
 p_owner uuid,p_project uuid,p_kind text,p_fingerprint text,
 p_version bigint,p_score integer,p_details jsonb,p_proposed jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_project public.projects; v_id uuid; v_week date; v_cap integer;
BEGIN
 IF p_owner IS NULL OR p_project IS NULL OR p_kind NOT IN ('priority','focus','blocker')
   OR p_fingerprint !~ '^[0-9a-f]{64}$' OR p_version<1
   OR p_score NOT BETWEEN 0 AND 100
   OR p_details IS NULL OR jsonb_typeof(p_details)<>'object' OR octet_length(p_details::text)>8192
   OR p_proposed IS NULL OR jsonb_typeof(p_proposed)<>'object' OR octet_length(p_proposed::text)>1024
 THEN RAISE EXCEPTION 'Invalid recommendation' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text,11));
 SELECT * INTO v_project FROM public.projects WHERE id=p_project AND owner_id=p_owner FOR UPDATE;
 IF NOT FOUND OR v_project.lifecycle IN ('archived','completed') OR v_project.version<>p_version
 THEN RAISE EXCEPTION 'Project changed or unavailable' USING ERRCODE='P0002'; END IF;
 IF p_kind='priority' THEN
   IF p_proposed->>'priority' NOT IN ('P0','P1','P2','P3')
     OR p_proposed->>'priority' IS NOT DISTINCT FROM v_project.priority
   THEN RAISE EXCEPTION 'Invalid priority suggestion' USING ERRCODE='22023'; END IF;
 ELSIF p_kind='focus' THEN
   v_week:=date_trunc('week',now() AT TIME ZONE 'Europe/Berlin')::date;
   v_cap:=(p_proposed->>'capacity')::integer;
   IF p_proposed->>'week' IS DISTINCT FROM v_week::text
      OR v_cap NOT BETWEEN 1 AND 3 OR v_project.lifecycle IN ('waiting','paused')
      OR EXISTS(SELECT 1 FROM public.development_phases
                WHERE owner_id=p_owner AND project_id=p_project AND state='blocked')
   THEN RAISE EXCEPTION 'Focus suggestion unavailable' USING ERRCODE='22023'; END IF;
   IF (SELECT count(*) FROM public.focus_items i JOIN public.focus_plans f
        ON f.id=i.plan_id AND f.owner_id=i.owner_id
        WHERE f.owner_id=p_owner AND f.week_start=v_week)>=v_cap
   THEN RAISE EXCEPTION 'Focus capacity reached' USING ERRCODE='22023'; END IF;
 ELSIF p_kind='blocker' THEN
   IF v_project.lifecycle NOT IN ('waiting','paused') AND NOT EXISTS(
     SELECT 1 FROM public.development_phases WHERE owner_id=p_owner
       AND project_id=p_project AND state='blocked')
   THEN RAISE EXCEPTION 'No recorded blocker' USING ERRCODE='22023'; END IF;
 END IF;
 INSERT INTO public.control_recommendations
   (owner_id,project_id,kind,fingerprint,source_version,score,details,proposed)
 VALUES(p_owner,p_project,p_kind,p_fingerprint,p_version,p_score,p_details,p_proposed)
 ON CONFLICT(owner_id,project_id,kind,fingerprint) DO NOTHING RETURNING id INTO v_id;
 IF v_id IS NULL THEN
   SELECT id INTO v_id FROM public.control_recommendations
    WHERE owner_id=p_owner AND project_id=p_project AND kind=p_kind AND fingerprint=p_fingerprint;
 ELSE
   INSERT INTO public.audit_log(owner_id,project_id,actor,action,new_data)
    VALUES(p_owner,p_project,'system','p4.recommendation.queued',
      jsonb_build_object('id',v_id,'kind',p_kind,'source_version',p_version,'engine','p4-rules-1'));
 END IF;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.control_p4_prepare(uuid,uuid,text,text,bigint,integer,jsonb,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_p4_prepare(uuid,uuid,text,text,bigint,integer,jsonb,jsonb)
 TO service_role;

CREATE FUNCTION public.control_p4_decide(p_owner uuid,p_recommendation uuid,p_decision text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE rec public.control_recommendations; current_ public.projects;
        v_week date; v_cap integer; v_plan uuid; v_slot integer; v_count integer; v_before jsonb;
BEGIN
 IF p_owner IS NULL OR p_recommendation IS NULL OR p_decision NOT IN ('accepted','rejected')
 THEN RAISE EXCEPTION 'Invalid decision' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text,11));
 SELECT * INTO rec FROM public.control_recommendations
  WHERE owner_id=p_owner AND id=p_recommendation AND state='pending' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Recommendation already decided or unavailable' USING ERRCODE='P0002'; END IF;
 IF p_decision='accepted' THEN
  SELECT * INTO current_ FROM public.projects
    WHERE owner_id=p_owner AND id=rec.project_id FOR UPDATE;
  IF NOT FOUND OR current_.version<>rec.source_version
    OR current_.lifecycle IN ('completed','archived')
  THEN RAISE EXCEPTION 'Project version changed; recompute recommendation' USING ERRCODE='P0002'; END IF;
  IF rec.kind='priority' THEN
    IF rec.proposed->>'priority' NOT IN ('P0','P1','P2','P3')
    THEN RAISE EXCEPTION 'Invalid priority' USING ERRCODE='22023'; END IF;
    v_before:=jsonb_build_object('priority',current_.priority,'version',current_.version);
    UPDATE public.projects SET priority=rec.proposed->>'priority',version=version+1,updated_at=now()
    WHERE owner_id=p_owner AND id=rec.project_id AND version=rec.source_version;
  ELSIF rec.kind='focus' THEN
    v_week:=date_trunc('week',now() AT TIME ZONE 'Europe/Berlin')::date;
    v_cap:=(rec.proposed->>'capacity')::integer;
    IF rec.proposed->>'week' IS DISTINCT FROM v_week::text
      OR v_cap NOT BETWEEN 1 AND 3 OR current_.lifecycle IN ('waiting','paused')
      OR EXISTS(SELECT 1 FROM public.development_phases WHERE owner_id=p_owner
        AND project_id=rec.project_id AND state='blocked')
    THEN RAISE EXCEPTION 'Focus context changed' USING ERRCODE='P0002'; END IF;
    INSERT INTO public.focus_plans(owner_id,week_start) VALUES(p_owner,v_week)
      ON CONFLICT(owner_id,week_start) DO UPDATE SET week_start=EXCLUDED.week_start
      RETURNING id INTO v_plan;
    IF EXISTS(SELECT 1 FROM public.focus_items WHERE owner_id=p_owner
       AND plan_id=v_plan AND project_id=rec.project_id)
    THEN RAISE EXCEPTION 'Already in focus' USING ERRCODE='P0002'; END IF;
    SELECT count(*) INTO v_count FROM public.focus_items WHERE owner_id=p_owner AND plan_id=v_plan;
    IF v_count>=v_cap THEN RAISE EXCEPTION 'Focus capacity reached' USING ERRCODE='P0002'; END IF;
    SELECT s INTO v_slot FROM generate_series(1,3) AS s
     WHERE NOT EXISTS(SELECT 1 FROM public.focus_items i
       WHERE i.owner_id=p_owner AND i.plan_id=v_plan AND i.slot=s) ORDER BY s LIMIT 1;
    IF v_slot IS NULL THEN RAISE EXCEPTION 'No focus slot' USING ERRCODE='P0002'; END IF;
    INSERT INTO public.focus_items(owner_id,plan_id,project_id,slot,objective)
     VALUES(p_owner,v_plan,rec.project_id,v_slot,
       left(coalesce(nullif(trim(current_.next_action),''),'Define next actionable step'),500));
  END IF;
 END IF;
 UPDATE public.control_recommendations SET state=p_decision,decided_at=now()
   WHERE owner_id=p_owner AND id=p_recommendation;
 INSERT INTO public.audit_log(owner_id,project_id,actor,action,previous_data,new_data)
 VALUES(p_owner,rec.project_id,'user','p4.recommendation.'||p_decision,v_before,
   jsonb_build_object('id',rec.id,'kind',rec.kind,'proposal',rec.proposed,
                      'source_version',rec.source_version,'score',rec.score));
 RETURN jsonb_build_object('id',rec.id,'state',p_decision,'kind',rec.kind,
   'applied',p_decision='accepted' AND rec.kind IN ('priority','focus'));
END $$;
REVOKE ALL ON FUNCTION public.control_p4_decide(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_p4_decide(uuid,uuid,text) TO service_role;
COMMIT;
