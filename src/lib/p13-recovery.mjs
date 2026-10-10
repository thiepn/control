// Recovery *preflight* only. No Supabase client, restore, credentials or release command.
import {qualifyDisposableRecovery} from './p11-disposable.mjs';
import {reviewP13OperatorAcknowledgment} from './p13-decision-separation.mjs';
import {defaultDeniedP12} from './p12-witness.mjs';
const SHA=/^[a-f0-9]{40}$/,HASH=/^[a-f0-9]{64}$/;
export function preflightP13Recovery({env,sourceSha,artifactSha,now,read,acknowledgment}){
 if(!SHA.test(sourceSha||'')||!HASH.test(artifactSha||'')
  ||env.CONTROL_P13_RECOVERY_MODE!=='READ_ONLY_DISPOSABLE_PRECHECK'
  ||env.CONTROL_P13_APPROVED_SOURCE_SHA!==sourceSha
  ||env.CONTROL_P13_APPROVED_ARTIFACT_SHA256!==artifactSha
  ||env.CONTROL_P13_NO_WRITE_ACK!=='NO_DATABASE_ACTIONS'
  ||env.CONTROL_P13_AUTH_SCOPE!=='SEPARATE_A_B_TEST_SESSIONS')
  throw Error('P13 exact disposable no-mutation scope not independently attested');
 const initial=qualifyDisposableRecovery({env,sourceSha,now,read});
 const review=reviewP13OperatorAcknowledgment({...acknowledgment,
  expectedSourceSha:sourceSha,expectedArtifactSha:artifactSha,now});
 if(review.decision!=='DENY')throw Error('Operator review cannot promote external recovery');
 return {schema:'control-p13-recovery-preflight-v1',source_sha:sourceSha,
  artifact_sha256:artifactSha,project_ref:initial.project_ref,
  scope:'READ_ONLY_DISPOSABLE_PRECHECK',config_verified:true,
  genuine_two_user_auth_verified:false,real_restore_performed:false,
  backup_verified:false,release_authorized:false,
  note:'Private external approval, actual Supabase backup/restore and human witnesses remain OPEN'};
}
export function defaultDeniedP13({sourceSha,artifactSha}){
 const inherited=defaultDeniedP12({sourceSha,artifactSha});
 return {...inherited,schema:'control-p13-closure-v1',
  missing:[...inherited.missing,'independent_owner_auditor_separation',
   'externally_governed_release_image_attestation'],
  decision:'DENY',release_authorized:false,merge_authorized:false,
  migration_authorized:false,deployment_authorized:false,
  human_signoff:'NOT_COLLECTED',physical_signoff:'NOT_COLLECTED',
  operational_release_approval:'NOT_COLLECTED'};
}
