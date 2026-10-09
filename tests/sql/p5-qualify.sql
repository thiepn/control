-- Runner-local PostgreSQL P5 regression, after P0-P5 schema + earlier fixtures.
DO $$
DECLARE a uuid:='11111111-1111-4111-8111-111111111111';
 b uuid:='22222222-2222-4222-8222-222222222222';
 this_week date:=date_trunc('week',now() AT TIME ZONE 'Europe/Berlin')::date;
 result jsonb; version_ bigint; denied boolean;
BEGIN
 result:=public.control_save_weekly_review(a,this_week,0,'draft',
 'Shipped a test','Waiting on signoff','Review security evidence');
 IF result->>'state'<>'draft' OR (result->>'version')::int<>1
 THEN RAISE EXCEPTION 'Draft review not created'; END IF;
 version_:=(result->>'version')::bigint;
 IF NOT EXISTS(SELECT 1 FROM public.control_weekly_reviews
   WHERE owner_id=a AND week_start=this_week AND
   jsonb_typeof(snapshot->'focus_project_ids')='array' AND submitted_at IS NULL)
 THEN RAISE EXCEPTION 'Review does not have a real focus snapshot'; END IF;
 denied:=false;
 BEGIN PERFORM public.control_save_weekly_review(b,this_week,version_,'draft','attack','','');
 EXCEPTION WHEN SQLSTATE 'P0002' THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Cross-owner write reused owner review'; END IF;
 denied:=false;
 BEGIN PERFORM public.control_save_weekly_review(a,this_week,0,'submit','','','');
 EXCEPTION WHEN SQLSTATE 'P0002' THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Stale review version accepted'; END IF;
 result:=public.control_save_weekly_review(a,this_week,version_,'submit',
 'Shipped P5 code','Remaining device acceptance','Qualify exact head');
 IF result->>'state'<>'submitted' OR (result->>'version')::int<>2
 THEN RAISE EXCEPTION 'Submit did not advance version'; END IF;
 denied:=false;
 BEGIN PERFORM public.control_save_weekly_review(a,this_week,2,'draft','rewrite','','');
 EXCEPTION WHEN SQLSTATE 'P0002' THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Submitted review changed'; END IF;
 denied:=false;
 BEGIN PERFORM public.control_save_weekly_review(a,this_week+7,0,'draft','','','');
 EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Future review accepted'; END IF;
 IF (SELECT count(*) FROM public.audit_log
   WHERE owner_id=a AND action IN ('p5.review.draft','p5.review.submit'))<>2
 THEN RAISE EXCEPTION 'Missing or duplicated review audit records'; END IF;
END $$;
SET ROLE authenticated;
SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.control_weekly_reviews WHERE wins='Shipped P5 code')
 THEN RAISE EXCEPTION 'Cross-owner weekly review leaked'; END IF;
 IF has_function_privilege(current_user,
  'public.control_save_weekly_review(uuid,date,bigint,text,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Authenticated browser can write review directly'; END IF;
END $$;
RESET ROLE;
SELECT 'PASS: P5 audited draft/submit versioning, immutable submission, week boundaries, tenant RLS' AS qualification;
