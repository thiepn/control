// Read-only authority-scoped recovery packet. Valid metadata is not real PostgreSQL/Supabase recovery.
import {auditP16RecoveryClaims} from './p16-recovery.mjs';
import {preflightP13Recovery} from './p13-recovery.mjs';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/;
export function auditP17RecoveryHandoff({recoveryClaimsContext,preflightContext,
 independentlyPinnedRecoveryGenesis,independentlyPinnedRecoveryHead,
 independentlyPinnedArchiveSha256,independentlyPinnedPriorStableSha256,
 expectedSourceSha,expectedArtifactSha,now}){
 if(!S.test(expectedSourceSha||'')||!H.test(expectedArtifactSha||'')
  ||!H.test(independentlyPinnedRecoveryGenesis||'')
  ||!H.test(independentlyPinnedRecoveryHead||'')
  ||!H.test(independentlyPinnedArchiveSha256||'')
  ||!H.test(independentlyPinnedPriorStableSha256||''))
  throw Error('External original-byte and source custody pins required');
 // The authorization is explicitly disposable, two separate A/B session files,
 // READ_ONLY_DISPOSABLE_PRECHECK and independently signed REVIEW_ONLY_DENY.
 const preflight=preflightP13Recovery({...preflightContext,
  sourceSha:expectedSourceSha,artifactSha:expectedArtifactSha,now});
 const custody=auditP16RecoveryClaims({...recoveryClaimsContext,
  expectedSourceSha,expectedArtifactSha,now,
  independentlyPinnedGenesisSha256:independentlyPinnedRecoveryGenesis,
  independentlyPinnedHeadSha256:independentlyPinnedRecoveryHead,
  independentlyPinnedArchiveSha256,
  independentlyPinnedPriorStableSha256});
 if(preflight.release_authorized||custody.release_authorized
  ||preflight.real_restore_performed!==false||custody.actual_disposable_restore_performed!==false)
  throw Error('No external restoration can be inferred from a signed claim');
 return {schema:'control-p17-authorized-disposable-recovery-handoff-v1',
  source_sha:expectedSourceSha,artifact_sha256:expectedArtifactSha,
  original_archive_sha256:independentlyPinnedArchiveSha256,
  prior_stable_sha256:independentlyPinnedPriorStableSha256,
  disposal_scope_preflight_verified:true,custody_claims_verified:custody.claims_verified,
  actual_backup_contents_examined:false,actual_project_auth_verified:false,
  real_authorized_supabase_restored:false,independent_human_witness_verified:false,
  release_authorized:false,production_rollback_authorized:false};
}
