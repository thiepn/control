// Configuration-only contract for separately authorized disposable Supabase recovery.
import {qualifyP9Staging} from '../../scripts/p9-staging-preflight.mjs';
const SHA=/^[a-f0-9]{40}$/;
export function qualifyDisposableRecovery({env,sourceSha,now,read}){
 if(!SHA.test(sourceSha||'')||env.CONTROL_P11_APPROVED_SOURCE_SHA!==sourceSha
  ||env.CONTROL_P11_OPERATOR_SCOPE!=='READ_ONLY_PRECHECK_DISPOSABLE'
  ||env.CONTROL_P11_RETENTION_ACK!=='REVIEWED_DISPOSABLE_ONLY'
  ||env.CONTROL_P11_DRY_RUN_ONLY!=='NO_MUTATIONS'
  ||typeof env.CONTROL_P11_APPROVAL_ID!=='string'
  ||!/^[a-zA-Z0-9-]{8,80}$/.test(env.CONTROL_P11_APPROVAL_ID))
  throw Error('Explicit independent disposable restore approval and no-mutation scope required');
 const time=Date.parse(now),approved=Date.parse(env.CONTROL_P11_APPROVED_AT);
 if(!Number.isFinite(time)||!Number.isFinite(approved)||approved>time||time-approved>3600000)
  throw Error('Operator staging authorization missing, future or expired');
 const preflight=qualifyP9Staging(env,sourceSha,read);
 return {schema:'control-p11-disposable-preflight-v1',project_ref:preflight.projectRef,
  source_sha:sourceSha,scope:'read_only_preflight_only',
  realRestorePerformed:false,realUserAuthVerified:false,
  releaseAuthorized:false,deploymentAuthorized:false,
  note:'Explicit authorization configuration only; never connects to Supabase'};
}
