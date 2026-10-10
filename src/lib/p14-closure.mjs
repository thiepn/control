import {defaultDeniedP13} from './p13-recovery.mjs';
export function defaultDeniedP14({sourceSha,artifactSha}){
 const previous=defaultDeniedP13({sourceSha,artifactSha});
 return {...previous,schema:'control-p14-default-denial-v1',
  missing:[...previous.missing,'independent_human_acceptance_reconciliation',
   'precutover_postrelease_operator_isolation',
   'revoked_signer_witness_reissue','genuine_outside_organization_build_provenance'],
  decision:'DENY',release_authorized:false,precutover_authorized:false,
  postrelease_authorized:false,rollback_authorized:false,
  merge_authorized:false,migration_authorized:false,deployment_authorized:false,
  real_supabase_authorized:false,actual_human_signoff:'NOT_COLLECTED',
  physical_device_acceptance:'NOT_COLLECTED',rights_owner_consent:'NOT_COLLECTED',
  separately_governed_build:'NOT_COLLECTED'};
}
