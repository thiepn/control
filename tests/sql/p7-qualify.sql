-- Real local PostgreSQL, two identities. NO production data and NO approval simulation.
DO $$
DECLARE a uuid:='11111111-1111-4111-8111-111111111111';
 b uuid:='22222222-2222-4222-8222-222222222222';
 sha text:=repeat('a',40);digest text:=repeat('b',64);
 first_id uuid; second_id uuid; denied boolean;
BEGIN
 first_id:=public.control_record_device_observation(a,'android_chrome',sha,digest,
  'Synthetic receipt for isolated database regression');
 second_id:=public.control_record_device_observation(a,'android_chrome',sha,digest,
  'Synthetic receipt for isolated database regression');
 IF first_id<>second_id THEN RAISE EXCEPTION 'Duplicate receipt not idempotent'; END IF;
 IF (SELECT count(*) FROM public.control_device_observations WHERE owner_id=a)<>1
 THEN RAISE EXCEPTION 'Duplicate receipt persisted'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.control_device_observations
  WHERE owner_id=a AND id=first_id AND classification='self_reported_unverified')
 THEN RAISE EXCEPTION 'Unverified evidence fabricated certification'; END IF;
 IF (SELECT count(*) FROM public.audit_log WHERE owner_id=a
   AND action='p7.observation.submitted')<>1
 THEN RAISE EXCEPTION 'Audit entry repeated or lost'; END IF;
 denied:=false;
 BEGIN
  PERFORM public.control_record_device_observation(a,'android_chrome','invalid',digest,'Test');
 EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Invalid source SHA accepted'; END IF;
 denied:=false;
 BEGIN
  PERFORM public.control_record_device_observation(a,'ios_safari',sha,digest,'');
 EXCEPTION WHEN SQLSTATE '22023' THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Empty receipt accepted'; END IF;
 -- Owner B may write its own unverified receipt, never owner A's rows.
 PERFORM public.control_record_device_observation(b,'ios_safari',sha,digest,'Second user');
 IF (SELECT count(*) FROM public.control_device_observations WHERE owner_id=b)<>1
 THEN RAISE EXCEPTION 'Owner B missing'; END IF;
END $$;
SET ROLE authenticated;
SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.control_device_observations
  WHERE surface='android_chrome') THEN
  RAISE EXCEPTION 'Device receipt leaked across accounts'; END IF;
 IF has_function_privilege(current_user,
 'public.control_record_device_observation(uuid,text,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Browser role may forge device receipt writer'; END IF;
END $$;
RESET ROLE;
SELECT 'PASS P7 owner RLS, receipt idempotency, unverified classification, audit and blocked writes' AS result;
