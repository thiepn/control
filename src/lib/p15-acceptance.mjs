// Integrate P14 physical/rights request handoff with consent, external image and recovery scopes.
// Intentionally no network, stored sessions, actual ownership or release outcome.
import {reconcileP14Handoff} from './p14-handoff.mjs';
import {auditP15ConsentHistory} from './p15-consent.mjs';
import {reconcileP14BuildProvenance} from './p14-recovery-build.mjs';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/;
export function reconcileP15ReviewPreparation({handoffContext,consentContext,
 independentlyPinnedSourceSha,independentlyPinnedArtifactSha256,
 independentlyPinnedHandoffHead,independentlyPinnedConsentHead,now,
 compromisedSignerIds=[]}){
 if(!S.test(independentlyPinnedSourceSha||'')||!H.test(independentlyPinnedArtifactSha256||'')
  ||!H.test(independentlyPinnedHandoffHead||'')||!H.test(independentlyPinnedConsentHead||''))
  throw Error('Independent review and consent source pins required');
 const handoff=reconcileP14Handoff({...handoffContext,
  expectedSourceSha:independentlyPinnedSourceSha,
  expectedArtifactSha:independentlyPinnedArtifactSha256,
  independentlyPinnedCustodyHeadSha256:independentlyPinnedHandoffHead});
 const consent=auditP15ConsentHistory({...consentContext,
  expectedSourceSha:independentlyPinnedSourceSha,
  expectedArtifactSha:independentlyPinnedArtifactSha256,
  pinnedHeadSha256:independentlyPinnedConsentHead,
  compromisedSignerIds,now});
 return {schema:'control-p15-external-review-preparation-v1',
  source_sha:independentlyPinnedSourceSha,review_requests:handoff.requested,
  consent_claims_reviewed:consent.records_verified,
  revoked_claims:consent.revoked_claims,
  independently_witnessed_consent:false,
  physical_android_or_ios_completed:false,
  nvda_or_voiceover_completed:false,privacy_and_source_rights_verified:false,
  release_authorized:false,postrelease_authorized:false,
  note:'Verified off-Git digest contract preparation only; all physical/human evidence remains OPEN'};
}
export function reconcileP15ExternalImagePreparation({buildContext,
 independentlyPinnedSourceSha,independentlyPinnedTreeSha,
 independentlyPinnedExecutableSha256,independentlyPinnedImageSha256}){
 const build=reconcileP14BuildProvenance({buildContext,
  independentlyPinnedSourceSha,independentlyPinnedTreeSha,
  independentlyPinnedExecutableSha256,independentlyPinnedImageSha256});
 return {...build,schema:'control-p15-outside-image-preparation-v1',
  actual_independent_organization_control:false,
  actual_production_OCI_digest_verified:false,
  actual_signer_private_key_custody_verified:false,
  production_release_eligible:false,release_authorized:false};
}
