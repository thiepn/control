-- P7 source-linked observation receipts. These are NOT operator approvals.
-- Review only; never apply migrations on THIEPN Account or THIEPN Core.
BEGIN;
CREATE TABLE public.control_device_observations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 surface text NOT NULL CHECK (surface IN
  ('android_chrome','ios_safari','nvda','voiceover','two_device','offline_recovery','rollback')),
 source_sha text NOT NULL CHECK (source_sha ~ '^[0-9a-f]{40}$'),
 evidence_sha256 text NOT NULL CHECK (evidence_sha256 ~ '^[0-9a-f]{64}$'),
 observation text NOT NULL CHECK (length(observation) BETWEEN 1 AND 500),
 classification text NOT NULL DEFAULT 'self_reported_unverified'
  CHECK (classification='self_reported_unverified'),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id,id),UNIQUE(owner_id,surface,source_sha,evidence_sha256)
);
ALTER TABLE public.control_device_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY p7_device_observation_owner ON public.control_device_observations
 FOR SELECT TO authenticated USING ((select auth.uid())=owner_id);
REVOKE ALL ON public.control_device_observations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.control_device_observations TO authenticated;

CREATE FUNCTION public.control_record_device_observation(
 p_owner uuid,p_surface text,p_source_sha text,p_evidence_sha256 text,p_observation text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_id uuid;
BEGIN
 IF p_owner IS NULL OR p_surface NOT IN
  ('android_chrome','ios_safari','nvda','voiceover','two_device','offline_recovery','rollback')
  OR p_source_sha !~ '^[0-9a-f]{40}$'
  OR p_evidence_sha256 !~ '^[0-9a-f]{64}$'
  OR p_observation IS NULL OR length(trim(p_observation)) NOT BETWEEN 1 AND 500
 THEN RAISE EXCEPTION 'Invalid observation metadata' USING ERRCODE='22023'; END IF;
 -- The app cannot prove a human's device result. Self-reported means unverified.
 INSERT INTO public.control_device_observations
 (owner_id,surface,source_sha,evidence_sha256,observation)
 VALUES(p_owner,p_surface,p_source_sha,p_evidence_sha256,trim(p_observation))
 ON CONFLICT(owner_id,surface,source_sha,evidence_sha256) DO NOTHING
 RETURNING id INTO v_id;
 IF v_id IS NOT NULL THEN
  INSERT INTO public.audit_log(owner_id,actor,action,new_data)
  VALUES(p_owner,'user','p7.observation.submitted',
   jsonb_build_object('receipt_id',v_id,'surface',p_surface,'source_sha',p_source_sha,
    'sha256',p_evidence_sha256,'classification','self_reported_unverified'));
 ELSE
  SELECT id INTO v_id FROM public.control_device_observations
   WHERE owner_id=p_owner AND surface=p_surface AND source_sha=p_source_sha
    AND evidence_sha256=p_evidence_sha256;
 END IF;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.control_record_device_observation(uuid,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.control_record_device_observation(uuid,text,text,text,text)
 TO service_role;
COMMIT;
