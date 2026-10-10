// Handoff-only. Even complete synthetic signatures cannot authorize a production action.
import {defaultDeniedP14} from './p14-closure.mjs';
export function defaultDeniedP15({sourceSha,artifactSha}){
 const previous=defaultDeniedP14({sourceSha,artifactSha});
 return {...previous,schema:'control-p15-default-denial-v1',
  missing:[...previous.missing,
   'independently_witnessed_consent_and_revocation',
   'owner_verified_original_object_rights',
   'real_physical_accessibility_acceptance',
   'external_restoration_witness_authorization',
   'signed_outside_organization_production_image',
   'independent_freeze_and_rollback_owner_decisions'],
  decision:'DENY',freeze_state:'HOLD',release_authorized:false,
  precutover_authorized:false,postrelease_authorized:false,
  rollback_authorized:false,merge_authorized:false,
  migration_authorized:false,deployment_authorized:false,
  actual_consent:'NOT_COLLECTED',human_signoff:'NOT_COLLECTED',
  physical_devices:'NOT_COLLECTED',rights_approval:'NOT_COLLECTED',
  real_supabase_restore:'NOT_COLLECTED',external_image:'NOT_COLLECTED'};
}
