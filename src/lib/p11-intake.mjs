// Privacy-safe, offline acceptance packet verifier. No evidence content, keys or Auth tokens persisted.
import {REQUIRED_GATES} from './p7-release.mjs';
import {auditTrustEpochs} from './p11-trust.mjs';
import {assessHumanEvidence} from './p10-evidence.mjs';
const SHA=/^[a-f0-9]{40}$/,HASH=/^[a-f0-9]{64}$/;
export function auditOperatorPacket({packet,trust,now,expectedSourceSha,expectedArtifactSha}){
 if(!packet||packet.schema!=='control-p11-operator-packet-v1'
  ||!SHA.test(packet.source_sha||'')||!HASH.test(packet.artifact_sha256||'')
  ||!HASH.test(packet.external_custody_anchor_sha256||'')
  ||!Array.isArray(packet.records)||packet.records.length>REQUIRED_GATES.length
  ||packet.classification!=='external_metadata_only')
  throw Error('Malformed or untrusted operator packet');
 if(!SHA.test(expectedSourceSha||'')||!HASH.test(expectedArtifactSha||'')
  ||packet.source_sha!==expectedSourceSha||packet.artifact_sha256!==expectedArtifactSha)
  throw Error('Independently expected source/artifact digest mismatch');
 const acceptedTrust=auditTrustEpochs({...trust,now});
 if(acceptedTrust.head_sha256!==packet.external_custody_anchor_sha256)
  throw Error('Custody head is not independently pinned to operator packet');
 const records=packet.records.map(item=>{
  const {record,signature}=item||{};
  if(!record||record.classification!=='independently_reviewed'
   ||!Object.hasOwn(acceptedTrust.activeKeys,record.reviewer))
   throw Error('Missing active externally trusted reviewer or unacceptable receipt');
  return {record,signature};
 });
 const review=assessHumanEvidence({records,sourceSha:packet.source_sha,
  artifactSha:packet.artifact_sha256,now,trustedReviewers:acceptedTrust.activeKeys});
 // Even a perfectly signed/fully populated metadata packet does not prove physical access,
 // genuine Supabase sessions, provenance or authority to release.
 return {schema:'control-p11-packet-audit-v1',source_sha:packet.source_sha,
  artifact_sha256:packet.artifact_sha256,packet_signature_count:review.reviewed_gate_count,
  missing_human_gates:review.missing_gates,
  operatorDecision:'DENY',releaseAuthorized:false,deploymentAuthorized:false,
  independentlyVerifiedHumanApproval:false,realDeviceApproval:false,
  note:'Cryptographic packet consistency only; independent human/device provenance not verified'};
}
export function defaultDeniedClosure({sourceSha,artifactSha,sourceVerified=false,
 binaryVerified=false,syntheticRestoreVerified=false,externalTrustVerified=false}){
 if(!SHA.test(sourceSha||'')||!HASH.test(artifactSha||''))throw Error('Exact review identities required');
 const open=[
  ...REQUIRED_GATES,
  ...(!externalTrustVerified?['independent_external_trust']:[]),
  ...(!sourceVerified?['exact_source_provenance']:[]),
  ...(!binaryVerified?['independent_binary_provenance']:[]),
  ...(!syntheticRestoreVerified?['synthetic_restore_rehearsal']:[]),
  'real_disposable_supabase_restore',
  'separate_manual_release_authorization'
 ];
 return {schema:'control-p11-closure-v1',source_sha:sourceSha,artifact_sha256:artifactSha,
  status:'DENIED',open_gates:open,release_authorized:false,merge_authorized:false,
  deployment_authorized:false,migration_authorized:false,
  human_signoff:'NOT_COLLECTED',physical_devices:'NOT_COLLECTED',
  real_disposable_supabase:'NOT_COLLECTED',independent_operator:'NOT_COLLECTED',
  note:'This is preparation, not an executable release command or real staging approval'};
}
