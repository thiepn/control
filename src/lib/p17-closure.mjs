// Publication and restoration remain impossible regardless of valid signed synthetic metadata.
import {defaultDeniedP16} from './p16-authority.mjs';
export function defaultDeniedP17({sourceSha,artifactSha}){
 const previous=defaultDeniedP16({sourceSha,artifactSha});
 return {...previous,schema:'control-p17-default-denial-v1',
  missing:[...previous.missing,'original_human_consent_adjudicator_identity',
   'actual_accessibility_original_observation_custody',
   'original_rights_and_privacy_owner_authorization',
   'externally_reissued_compromised_signer_keys',
   'real_authorized_disposable_original_byte_recovery',
   'independent_governance_production_image_release_custody',
   'frozen_candidate_real_owner_and_auditor_cutover',
   'separate_postrelease_rollback_and_restore_witness'],
  decision:'DENY',freeze_state:'HOLD',release_authorized:false,
  migration_authorized:false,rollback_authorized:false,
  precutover_authorized:false,postrelease_authorized:false,
  deployment_authorized:false,merge_authorized:false,
  human_acceptance:'NOT_COLLECTED',rights_consent:'NOT_COLLECTED',
  physical_device_accessibility:'NOT_COLLECTED',
  original_byte_external_restore:'NOT_COLLECTED',
  independent_production_image:'NOT_COLLECTED'};
}
