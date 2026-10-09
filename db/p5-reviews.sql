-- P5 weekly reviews. Only for reviewed, separately authorized migrations.
BEGIN;
CREATE TABLE public.control_weekly_reviews(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','submitted')),
  version bigint NOT NULL DEFAULT 1 CHECK(version>0),
  wins text NOT NULL DEFAULT '' CHECK(length(wins)<=2000),
  blockers text NOT NULL DEFAULT '' CHECK(length(blockers)<=2000),
  next_week text NOT NULL DEFAULT '' CHECK(length(next_week)<=2000),
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(snapshot)='object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  UNIQUE(owner_id,id), UNIQUE(owner_id,week_start),
  CONSTRAINT submitted_timestamp CHECK ((state='submitted')=(submitted_at IS NOT NULL))
);
ALTER TABLE public.control_weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY p5_review_owner_read ON public.control_weekly_reviews
 FOR SELECT TO authenticated USING((select auth.uid())=owner_id);
REVOKE ALL ON public.control_weekly_reviews FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.control_weekly_reviews TO authenticated;

CREATE FUNCTION public.control_save_weekly_review(
 p_owner uuid,p_week date,p_expected_version bigint,p_action text,
 p_wins text,p_blockers text,p_next_week text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE previous public.control_weekly_reviews;
 review_id uuid; result_version bigint; state_out text;
 current_week date:=date_trunc('week',now() AT TIME ZONE 'Europe/Berlin')::date;
 snapshot_data jsonb; prev_data jsonb;
BEGIN
 IF p_owner IS NULL OR p_week IS NULL OR p_week<>date_trunc('week',p_week::timestamp)::date
   OR p_week>current_week OR p_week<current_week-84
   OR p_expected_version IS NULL OR p_expected_version<0
   OR p_action NOT IN ('draft','submit')
   OR p_wins IS NULL OR p_blockers IS NULL OR p_next_week IS NULL
   OR length(p_wins)>2000 OR length(p_blockers)>2000 OR length(p_next_week)>2000
 THEN RAISE EXCEPTION 'Invalid weekly review' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||p_week::text,51));
 SELECT * INTO previous FROM public.control_weekly_reviews
 WHERE owner_id=p_owner AND week_start=p_week FOR UPDATE;
 IF FOUND THEN
   IF previous.version<>p_expected_version OR previous.state='submitted'
   THEN RAISE EXCEPTION 'Review changed or already submitted' USING ERRCODE='P0002'; END IF;
   prev_data:=to_jsonb(previous);
 ELSE
   IF p_expected_version<>0 THEN RAISE EXCEPTION 'Review version mismatch' USING ERRCODE='P0002'; END IF;
 END IF;
 -- Server-derived point-in-time data. Never claim these counts certify completion.
 SELECT jsonb_build_object(
  'captured_at',now(),
  'projects_active',(SELECT count(*) FROM public.projects
    WHERE owner_id=p_owner AND lifecycle='active'),
  'projects_completed',(SELECT count(*) FROM public.projects
    WHERE owner_id=p_owner AND lifecycle='completed'),
  'focus_project_ids',coalesce((SELECT jsonb_agg(i.project_id ORDER BY i.slot)
    FROM public.focus_plans f JOIN public.focus_items i ON i.owner_id=f.owner_id AND i.plan_id=f.id
    WHERE f.owner_id=p_owner AND f.week_start=p_week),'[]'::jsonb)
 ) INTO snapshot_data;
 state_out:=CASE WHEN p_action='submit' THEN 'submitted' ELSE 'draft' END;
 IF previous.id IS NULL THEN
  INSERT INTO public.control_weekly_reviews
  (owner_id,week_start,state,wins,blockers,next_week,snapshot,submitted_at)
  VALUES(p_owner,p_week,state_out,p_wins,p_blockers,p_next_week,snapshot_data,
         CASE WHEN p_action='submit' THEN now() ELSE NULL END)
  RETURNING id,version INTO review_id,result_version;
 ELSE
  UPDATE public.control_weekly_reviews SET state=state_out,wins=p_wins,blockers=p_blockers,
    next_week=p_next_week,snapshot=snapshot_data,version=version+1,updated_at=now(),
    submitted_at=CASE WHEN p_action='submit' THEN now() ELSE NULL END
  WHERE owner_id=p_owner AND id=previous.id
  RETURNING id,version INTO review_id,result_version;
 END IF;
 INSERT INTO public.audit_log(owner_id,actor,action,previous_data,new_data)
 VALUES(p_owner,'user','p5.review.'||p_action,
  CASE WHEN previous.id IS NULL THEN NULL ELSE
   jsonb_build_object('id',previous.id,'version',previous.version,'state',previous.state) END,
  jsonb_build_object('review_id',review_id,'week_start',p_week,'state',state_out,
    'version',result_version,'snapshot',snapshot_data));
 RETURN jsonb_build_object('id',review_id,'version',result_version,'state',state_out,
  'week_start',p_week,'submitted',p_action='submit');
END $$;
REVOKE ALL ON FUNCTION public.control_save_weekly_review(uuid,date,bigint,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_save_weekly_review(uuid,date,bigint,text,text,text,text)
 TO service_role;
COMMIT;
