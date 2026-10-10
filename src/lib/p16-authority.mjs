// Production decision isolation after revocation. Always fails closed: there is no deploy action.
import {auditP15Freeze} from './p15-freeze.mjs';
import {reconcileP15ExternalImagePreparation} from './p15-acceptance.mjs';
import {defaultDeniedP15} from './p15-closure.mjs';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/;
export function auditP16ReleaseIsolation({freezeContext,imageContext,
 expectedSourceSha,expectedArtifactSha,independentlyPinnedConsentHead,
 independentlyPinnedImageSha256,independentlyPinnedTreeSha,
 independentlyPinnedExecutableSha256,quarantineStatus,now}){
 if(!S.test(expectedSourceSha||'')||!H.test(expectedArtifactSha||'')
  ||!H.test(independentlyPinnedConsentHead||'')
  ||!H.test(independentlyPinnedImageSha256||'')||!S.test(independentlyPinnedTreeSha||'')
  ||!H.test(independentlyPinnedExecutableSha256||'')
  ||!['QUARANTINED','AWAITING_REAL_HUMAN_ACCEPTANCE'].includes(quarantineStatus))
  throw Error('External release source/image/consent pins and status required');
 const freeze=auditP15Freeze({...freezeContext,expectedSourceSha,expectedArtifactSha,
  independentlyPinnedConsentHead,independentlyPinnedImageSha256,now});
 const image=reconcileP15ExternalImagePreparation({...imageContext,
  independentlyPinnedSourceSha:expectedSourceSha,
  independentlyPinnedTreeSha,independentlyPinnedExecutableSha256,
  independentlyPinnedImageSha256});
 if(freeze.release_authorized||image.release_authorized)
  throw Error('Cannot elevate cryptographic review metadata to release authority');
 return {schema:'control-p16-release-isolation-v1',source_sha:expectedSourceSha,
  consent_status:quarantineStatus,freeze_state:'HOLD',decision:'DENY',
  external_signed_build_claims:image.claim_count,
  actual_external_image_verified:false,precutover_authorized:false,
  postrelease_authorized:false,rollback_authorized:false,
  merge_authorized:false,migration_authorized:false,
  release_authorized:false,deployment_authorized:false,
  actual_human_cutover_and_recovery_signoff:false};
}
export function defaultDeniedP16({sourceSha,artifactSha}){
 const p=defaultDeniedP15({sourceSha,artifactSha});
 return {...p,schema:'control-p16-default-denial-v1',
  missing:[...p.missing,'revoked_subject_data_quarantine_independent_acceptance',
   'compromised_custodian_external_reissue','physical_accessibility_real_witness_chain',
   'independent_original_byte_disposable_restore','production_image_outside_governance',
   'separate_precutover_postrelease_human_approval'],
  decision:'DENY',freeze_state:'HOLD',release_authorized:false,
  postrelease_authorized:false,rollback_authorized:false,
  deploy_authorized:false,actual_human_consent:'NOT_COLLECTED',
  independent_device_witness:'NOT_COLLECTED',supabase_auth:'NOT_COLLECTED',
  real_restore:'NOT_COLLECTED',production_image:'NOT_COLLECTED'};
}
