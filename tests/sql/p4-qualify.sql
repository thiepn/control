-- Real disposable PostgreSQL, never a live Supabase project.
DO $$
DECLARE owner_a uuid:='11111111-1111-4111-8111-111111111111';
        owner_b uuid:='22222222-2222-4222-8222-222222222222';
        p public.projects; q uuid; focus_q uuid; rejected uuid; denied boolean;
        week date:=date_trunc('week',now() AT TIME ZONE 'Europe/Berlin')::date;
BEGIN
 SELECT * INTO p FROM public.control_mutate_project(owner_a,'create',null,
   '{"title":"P4 test project","slug":"p4-test-project","lifecycle":"active","priority":"P2","next_action":"Write tests"}',null);
 q:=public.control_p4_prepare(owner_a,p.id,'priority',repeat('a',64),p.version,72,
      '{"engine":"p4-rules-1","factors":[{"key":"deadline","points":10}]}',
      '{"priority":"P1"}');
 IF public.control_p4_prepare(owner_a,p.id,'priority',repeat('a',64),p.version,72,
      '{"engine":"p4-rules-1"}','{"priority":"P1"}') IS DISTINCT FROM q
 THEN RAISE EXCEPTION 'duplicate recommendation inserted'; END IF;
 denied:=false;
 BEGIN
   PERFORM public.control_p4_decide(owner_b,q,'accepted');
 EXCEPTION WHEN SQLSTATE 'P0002' THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'cross-owner recommendation approval succeeded'; END IF;
 PERFORM public.control_p4_decide(owner_a,q,'accepted');
 IF NOT EXISTS(SELECT 1 FROM public.projects WHERE owner_id=owner_a AND id=p.id
   AND priority='P1' AND version=p.version+1)
 THEN RAISE EXCEPTION 'approved priority not applied with version increment'; END IF;
 denied:=false;
 BEGIN PERFORM public.control_p4_decide(owner_a,q,'accepted');
 EXCEPTION WHEN SQLSTATE 'P0002' THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'duplicate approval accepted'; END IF;
 SELECT * INTO p FROM public.projects WHERE id=p.id;
 -- Earlier P2 fixture already occupies a slot. Capacity=1 must reject new entries.
 denied:=false;
 BEGIN
  PERFORM public.control_p4_prepare(owner_a,p.id,'focus',repeat('d',64),p.version,65,
    '{"engine":"p4-rules-1"}',jsonb_build_object('week',week,'capacity',1));
 EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'full focus capacity accepted an extra project'; END IF;
 focus_q:=public.control_p4_prepare(owner_a,p.id,'focus',repeat('b',64),p.version,65,
      '{"engine":"p4-rules-1"}',jsonb_build_object('week',week,'capacity',3));
 PERFORM public.control_p4_decide(owner_a,focus_q,'accepted');
 IF NOT EXISTS(SELECT 1 FROM public.focus_items i JOIN public.focus_plans f
  ON f.id=i.plan_id WHERE f.owner_id=owner_a AND f.week_start=week AND i.project_id=p.id)
 THEN RAISE EXCEPTION 'accepted focus not applied'; END IF;
 rejected:=public.control_p4_prepare(owner_a,p.id,'priority',repeat('c',64),p.version,50,
      '{"engine":"p4-rules-1"}','{"priority":"P3"}');
 PERFORM public.control_p4_decide(owner_a,rejected,'rejected');
 IF NOT EXISTS(SELECT 1 FROM public.projects WHERE owner_id=owner_a AND id=p.id
  AND priority='P1') THEN RAISE EXCEPTION 'rejection changed priority'; END IF;
 IF (SELECT count(*) FROM public.audit_log
   WHERE owner_id=owner_a AND project_id=p.id AND action LIKE 'p4.recommendation.%')<>6
 THEN RAISE EXCEPTION 'missing P4 audit entries'; END IF;
 denied:=false;
 BEGIN PERFORM public.control_p4_prepare(owner_b,p.id,'priority',repeat('d',64),p.version,70,
   '{"engine":"p4-rules-1"}','{"priority":"P0"}');
 EXCEPTION WHEN SQLSTATE 'P0002' THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'cross-owner prepare succeeded'; END IF;
END $$;
SET ROLE authenticated;
SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.control_recommendations WHERE fingerprint=repeat('a',64))
 THEN RAISE EXCEPTION 'RLS leaked private recommendation'; END IF;
 IF has_function_privilege(current_user,'public.control_p4_decide(uuid,uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'browser may write recommendations'; END IF;
END $$;
RESET ROLE;
SELECT 'PASS: P4 owner-scoped priority, focus, rejection, idempotency, audit and browser RLS' AS qualification;
