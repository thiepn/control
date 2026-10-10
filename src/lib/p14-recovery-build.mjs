// Separate explicitly authorized read-only recovery PREPARATION and external image provenance claims.
import {verifyExternalWitness} from './p12-witness.mjs';
import {preflightP13Recovery} from './p13-recovery.mjs';
import {auditP13ExternalBuilders} from './p13-external-build.mjs';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/;
export function prepareP14DisposableWitness({recoveryContext,witnessContext,
 independentlyPinnedWitnessKeySha256,independentlyPinnedCustodySha256,
 expectedSourceSha,expectedArtifactSha}){
 if(!S.test(expectedSourceSha||'')||!H.test(expectedArtifactSha||'')
  ||!H.test(independentlyPinnedWitnessKeySha256||'')
  ||!H.test(independentlyPinnedCustodySha256||''))
  throw Error('Independently pinned recovery witness prerequisites required');
 const preflight=preflightP13Recovery({...recoveryContext,
  sourceSha:expectedSourceSha,artifactSha:expectedArtifactSha});
 const witness=verifyExternalWitness({...witnessContext,
  pinnedWitnessKeySha256:independentlyPinnedWitnessKeySha256,
  pinnedCustodySha256:independentlyPinnedCustodySha256,
  expectedSourceSha,expectedArtifactSha});
 if(witness.kind!=='disposable_restore'||preflight.real_restore_performed!==false
  ||witness.real_operation_confirmed!==false)
  throw Error('Unexpected real-operation or incorrect recovery witness');
 return {schema:'control-p14-disposable-restore-preparation-v1',
  source_sha:expectedSourceSha,reviewed_project_ref:preflight.project_ref,
  cryptographic_claim_checked:true,actual_authorized_supabase_restore:false,
  operator_recovery_approval:false,physical_reviewer_verified:false,
  release_authorized:false,
  note:'Offline metadata, no real service connection or restoration'};
}
export function reconcileP14BuildProvenance({buildContext,independentlyPinnedSourceSha,
 independentlyPinnedTreeSha,independentlyPinnedExecutableSha256,
 independentlyPinnedImageSha256,externalOrganizationsActuallyVerified=false}){
 if(!S.test(independentlyPinnedSourceSha||'')||!S.test(independentlyPinnedTreeSha||'')
  ||!H.test(independentlyPinnedExecutableSha256||'')
  ||!H.test(independentlyPinnedImageSha256||''))
  throw Error('Independent source, exact tree, emitted executable and image digest required');
 const result=auditP13ExternalBuilders({...buildContext,
  expectedSourceSha:independentlyPinnedSourceSha,
  expectedTreeSha:independentlyPinnedTreeSha,
  expectedExecutableSha256:independentlyPinnedExecutableSha256});
 // Do not treat self-reported external organization claims as actual custody.
 return {schema:'control-p14-build-provenance-preparation-v1',
  claim_count:result.distinct_organization_claims_verified,
  executable_sha256:independentlyPinnedExecutableSha256,
  expected_image_sha256:independentlyPinnedImageSha256,
  externalOrganizationsActuallyVerifiedIgnored:externalOrganizationsActuallyVerified===true,
  actual_external_governance_verified:false,production_image_reproduced:false,
  production_supply_chain_approved:false,release_authorized:false};
}
