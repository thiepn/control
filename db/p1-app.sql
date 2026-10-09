-- P1 review-only addendum to db/schema.sql. DO NOT apply to existing / production Supabase.
-- Test against a disposable Supabase project with two real Auth users before promotion.
BEGIN;
CREATE TABLE public.repository_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  github_repository_id bigint NOT NULL CHECK (github_repository_id > 0),
  full_name text NOT NULL CHECK (full_name ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'),
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','linked','dismissed')),
  review_note text,
  project_id uuid,
  received_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  UNIQUE(owner_id,id), UNIQUE(owner_id,github_repository_id),
  FOREIGN KEY(owner_id,project_id) REFERENCES public.projects(owner_id,id) ON DELETE SET NULL (project_id)
);
ALTER TABLE public.repository_candidates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.repository_candidates FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.repository_candidates TO authenticated;
CREATE POLICY candidate_owner_read ON public.repository_candidates FOR SELECT TO authenticated
USING ((select auth.uid()) = owner_id);

-- All mutations are transactional, server-only and audited. Service key never enters client bundle.
CREATE FUNCTION public.control_mutate_project(
  p_owner uuid,p_action text,p_id uuid,p_payload jsonb,p_version bigint
) RETURNS public.projects
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE before_row public.projects; result public.projects; next_rank numeric(18,6);
BEGIN
 IF p_owner IS NULL OR p_payload IS NULL THEN RAISE EXCEPTION 'Invalid input' USING ERRCODE='22023'; END IF;
 IF p_action='create' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text, 11));
  SELECT coalesce(max(manual_rank),0)+1000 INTO next_rank FROM public.projects WHERE owner_id=p_owner;
  INSERT INTO public.projects(owner_id,title,slug,summary,category,lifecycle,priority,manual_rank,deadline_date,deadline_kind,next_action)
  VALUES(p_owner,p_payload->>'title',p_payload->>'slug',p_payload->>'summary',p_payload->>'category',
   coalesce(p_payload->>'lifecycle','inbox'),p_payload->>'priority',next_rank,
   (p_payload->>'deadline_date')::date,p_payload->>'deadline_kind',p_payload->>'next_action') RETURNING * INTO result;
 ELSIF p_action IN ('update','archive') THEN
  IF p_id IS NULL OR p_version IS NULL THEN RAISE EXCEPTION 'Version required' USING ERRCODE='22023'; END IF;
  SELECT * INTO before_row FROM public.projects WHERE owner_id=p_owner AND id=p_id FOR UPDATE;
  IF NOT FOUND OR before_row.version<>p_version THEN RAISE EXCEPTION 'Conflict or record unavailable' USING ERRCODE='P0002'; END IF;
  IF p_action='archive' THEN
   UPDATE public.projects SET lifecycle='archived',version=version+1,updated_at=now()
    WHERE owner_id=p_owner AND id=p_id RETURNING * INTO result;
  ELSE
   UPDATE public.projects SET
    title=CASE WHEN p_payload?'title' THEN p_payload->>'title' ELSE title END,
    slug=CASE WHEN p_payload?'slug' THEN p_payload->>'slug' ELSE slug END,
    summary=CASE WHEN p_payload?'summary' THEN p_payload->>'summary' ELSE summary END,
    category=CASE WHEN p_payload?'category' THEN p_payload->>'category' ELSE category END,
    lifecycle=CASE WHEN p_payload?'lifecycle' THEN p_payload->>'lifecycle' ELSE lifecycle END,
    priority=CASE WHEN p_payload?'priority' THEN p_payload->>'priority' ELSE priority END,
    deadline_date=CASE WHEN p_payload?'deadline_date' THEN (p_payload->>'deadline_date')::date ELSE deadline_date END,
    deadline_kind=CASE WHEN p_payload?'deadline_kind' THEN p_payload->>'deadline_kind' ELSE deadline_kind END,
    next_action=CASE WHEN p_payload?'next_action' THEN p_payload->>'next_action' ELSE next_action END,
    version=version+1,updated_at=now()
   WHERE owner_id=p_owner AND id=p_id RETURNING * INTO result;
  END IF;
 ELSE RAISE EXCEPTION 'Unknown action' USING ERRCODE='22023'; END IF;
 INSERT INTO public.audit_log(owner_id,project_id,actor,action,previous_data,new_data)
 VALUES(p_owner,result.id,'user','project.'||p_action,CASE WHEN p_action='create' THEN NULL ELSE to_jsonb(before_row) END,to_jsonb(result));
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.control_mutate_project(uuid,text,uuid,jsonb,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_mutate_project(uuid,text,uuid,jsonb,bigint) TO service_role;

CREATE FUNCTION public.control_move_project(p_owner uuid,p_project uuid,p_direction smallint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog,public AS $$
DECLARE current_row public.projects; neighbor public.projects; old_rank numeric(18,6);
BEGIN
 IF p_direction NOT IN (-1,1) THEN RAISE EXCEPTION 'Invalid direction' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text,11));
 SELECT * INTO current_row FROM public.projects WHERE owner_id=p_owner AND id=p_project AND lifecycle<>'archived' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Project missing' USING ERRCODE='P0002'; END IF;
 IF p_direction=-1 THEN
  SELECT * INTO neighbor FROM public.projects WHERE owner_id=p_owner AND lifecycle<>'archived' AND manual_rank<current_row.manual_rank ORDER BY manual_rank DESC LIMIT 1 FOR UPDATE;
 ELSE
  SELECT * INTO neighbor FROM public.projects WHERE owner_id=p_owner AND lifecycle<>'archived' AND manual_rank>current_row.manual_rank ORDER BY manual_rank ASC LIMIT 1 FOR UPDATE;
 END IF;
 IF NOT FOUND THEN RETURN false; END IF;
 old_rank:=current_row.manual_rank;
 UPDATE public.projects SET manual_rank=neighbor.manual_rank,version=version+1,updated_at=now() WHERE id=current_row.id AND owner_id=p_owner;
 UPDATE public.projects SET manual_rank=old_rank,version=version+1,updated_at=now() WHERE id=neighbor.id AND owner_id=p_owner;
 INSERT INTO public.audit_log(owner_id,project_id,actor,action,previous_data,new_data)
 VALUES(p_owner,p_project,'user','project.reorder',jsonb_build_object('manual_rank',old_rank),jsonb_build_object('manual_rank',neighbor.manual_rank));
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.control_move_project(uuid,uuid,smallint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_move_project(uuid,uuid,smallint) TO service_role;

CREATE FUNCTION public.control_replace_focus(p_owner uuid,p_week date,p_projects uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog,public AS $$
DECLARE v_plan_id uuid; project_count integer; i integer; first_id uuid;
BEGIN
 project_count:=coalesce(cardinality(p_projects),0);
 IF p_owner IS NULL OR p_week IS NULL OR project_count>3 OR p_week<>date_trunc('week',p_week::timestamp)::date
 THEN RAISE EXCEPTION 'Invalid focus plan' USING ERRCODE='22023'; END IF;
 IF (SELECT count(DISTINCT id) FROM unnest(p_projects) as ids(id))<>project_count
 THEN RAISE EXCEPTION 'Duplicate focus project' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM public.projects WHERE owner_id=p_owner AND id=ANY(p_projects) AND lifecycle<>'archived')<>project_count
 THEN RAISE EXCEPTION 'Unknown focus project' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||p_week::text,12));
 INSERT INTO public.focus_plans(owner_id,week_start) VALUES(p_owner,p_week)
 ON CONFLICT(owner_id,week_start) DO UPDATE SET week_start=EXCLUDED.week_start RETURNING id INTO v_plan_id;
 DELETE FROM public.focus_items WHERE owner_id=p_owner AND plan_id=v_plan_id;
 FOR i IN 1..project_count LOOP
  first_id:=p_projects[i];
  INSERT INTO public.focus_items(owner_id,plan_id,project_id,slot,objective)
  VALUES(p_owner,v_plan_id,first_id,i,'Select one next actionable step');
 END LOOP;
 INSERT INTO public.audit_log(owner_id,actor,action,new_data) VALUES(p_owner,'user','focus.replace',jsonb_build_object('week',p_week,'projects',p_projects));
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('project_id',project_id,'slot',slot,'objective',objective) ORDER BY slot),'[]'::jsonb) FROM public.focus_items WHERE owner_id=p_owner AND focus_items.plan_id=v_plan_id);
END $$;
REVOKE ALL ON FUNCTION public.control_replace_focus(uuid,date,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_replace_focus(uuid,date,uuid[]) TO service_role;

CREATE FUNCTION public.control_intake_candidates(p_owner uuid,p_rows jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog,public AS $$
DECLARE entry jsonb; n integer:=0;
BEGIN
 IF jsonb_typeof(p_rows)<>'array' OR jsonb_array_length(p_rows)>250 THEN RAISE EXCEPTION 'Invalid intake' USING ERRCODE='22023'; END IF;
 FOR entry IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  INSERT INTO public.repository_candidates(owner_id,full_name,github_repository_id)
  VALUES(p_owner,entry->>'full_name',(entry->>'github_repository_id')::bigint)
  ON CONFLICT(owner_id,github_repository_id) DO NOTHING;
  n:=n+1;
 END LOOP;
 INSERT INTO public.audit_log(owner_id,actor,action,new_data) VALUES(p_owner,'user','candidates.import',jsonb_build_object('submitted',n));
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.control_intake_candidates(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_intake_candidates(uuid,jsonb) TO service_role;

CREATE FUNCTION public.control_review_candidate(p_owner uuid,p_candidate uuid,p_action text,p_project uuid)
RETURNS public.repository_candidates LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE row_ public.repository_candidates; repo_id uuid;
BEGIN
 SELECT * INTO row_ FROM public.repository_candidates WHERE owner_id=p_owner AND id=p_candidate FOR UPDATE;
 IF NOT FOUND OR row_.review_status<>'pending' THEN RAISE EXCEPTION 'Candidate unavailable' USING ERRCODE='P0002'; END IF;
 IF p_action='dismiss' THEN
  UPDATE public.repository_candidates SET review_status='dismissed',decided_at=now() WHERE id=p_candidate RETURNING * INTO row_;
 ELSIF p_action='link' THEN
  IF NOT EXISTS(SELECT 1 FROM public.projects WHERE owner_id=p_owner AND id=p_project) THEN RAISE EXCEPTION 'Project missing' USING ERRCODE='42501'; END IF;
  INSERT INTO public.github_repositories(owner_id,github_repository_id,full_name)
  VALUES(p_owner,row_.github_repository_id,row_.full_name)
  ON CONFLICT(owner_id,github_repository_id) DO UPDATE SET full_name=EXCLUDED.full_name RETURNING id INTO repo_id;
  INSERT INTO public.project_repository_links(owner_id,project_id,repository_id) VALUES(p_owner,p_project,repo_id)
  ON CONFLICT(owner_id,repository_id) DO NOTHING;
  IF NOT EXISTS(SELECT 1 FROM public.project_repository_links WHERE owner_id=p_owner AND repository_id=repo_id AND project_id=p_project)
   THEN RAISE EXCEPTION 'Repository linked elsewhere' USING ERRCODE='23505'; END IF;
  UPDATE public.repository_candidates SET review_status='linked',project_id=p_project,decided_at=now() WHERE id=p_candidate RETURNING * INTO row_;
 ELSE RAISE EXCEPTION 'Invalid review action' USING ERRCODE='22023'; END IF;
 INSERT INTO public.audit_log(owner_id,project_id,actor,action,new_data)
 VALUES(p_owner,p_project,'user','candidate.'||p_action,to_jsonb(row_));
 RETURN row_;
END $$;
REVOKE ALL ON FUNCTION public.control_review_candidate(uuid,uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_review_candidate(uuid,uuid,text,uuid) TO service_role;
COMMIT;
