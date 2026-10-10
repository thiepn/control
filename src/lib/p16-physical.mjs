// Off-repo accessibility custody packet consistency, not completed physical accessibility testing.
import {reconcileP14Handoff} from './p14-handoff.mjs';
import {auditP13WitnessIntake} from './p13-witness-intake.mjs';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/;
const REQUIRED=['android_chrome','ios_safari','nvda','voiceover','rights_provenance','privacy_review'];
export function prepareP16PhysicalCustody({handoffContext,witnessContext,
 expectedSourceSha,expectedArtifactSha,independentlyPinnedHandoffHead,
 independentlyPinnedWitnessHead,now}){
 if(!S.test(expectedSourceSha||'')||!H.test(expectedArtifactSha||'')
  ||!H.test(independentlyPinnedHandoffHead||'')
  ||!H.test(independentlyPinnedWitnessHead||'')
  ||witnessContext?.pinnedHeadSha256!==independentlyPinnedWitnessHead)
  throw Error('External handoff/witness heads must be independently pinned');
 const handoff=reconcileP14Handoff({...handoffContext,
  expectedSourceSha,expectedArtifactSha,
  independentlyPinnedCustodyHeadSha256:independentlyPinnedHandoffHead});
 const witness=auditP13WitnessIntake({...witnessContext,
  expectedSourceSha,expectedArtifactSha,now});
 if(!REQUIRED.every(s=>handoff.requested_surfaces.includes(s)))
  throw Error('All physical, screen-reader, privacy and rights reviewer requests required');
 const needed=['android_device','ios_device','screen_reader','source_rights','privacy_review'];
 if(!needed.every(k=>witness.categories_seen.includes(k)))
  throw Error('Independently signed metadata for each review class required');
 // Screen-reader claims are not evidence of BOTH NVDA and VoiceOver hardware.
 return {schema:'control-p16-physical-custody-v1',
  source_sha:expectedSourceSha,review_requests:handoff.requested,
  cryptographic_review_claims:witness.records_verified,
  immutable_handoff_digests:handoff.request_digests,
  pending_real_devices:['android_chrome','ios_safari','nvda','voiceover'],
  privacy_rights_human_signoff:'NOT_COLLECTED',
  actual_accessibility_acceptance:false,actual_device_control_verified:false,
  independent_real_reviewer_verified:false,release_authorized:false};
}
