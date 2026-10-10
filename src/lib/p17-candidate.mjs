// Frozen release-candidate custody snapshot, not a deploy/approval command.
import {createHash,createPublicKey,verify} from 'node:crypto';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/,N=/^[a-f0-9]{32}$/,ID=/^[A-Za-z0-9._-]{3,80}$/;
const sha=s=>createHash('sha256').update(s).digest('hex');
export function canonicalP17Candidate(r){
 if(!r||r.schema!=='control-p17-frozen-candidate-v1'
  ||!S.test(r.source_sha||'')||!S.test(r.tree_sha||'')
  ||!H.test(r.artifact_sha256||'')||!H.test(r.image_sha256||'')
  ||!H.test(r.executable_sha256||'')||!H.test(r.consent_head_sha256||'')
  ||!H.test(r.original_witness_head_sha256||'')||!H.test(r.restore_head_sha256||'')
  ||!H.test(r.rotation_head_sha256||'')||!H.test(r.previous_candidate_sha256||'')
  ||!N.test(r.nonce||'')||!ID.test(r.owner_id||'')||!ID.test(r.reviewer_id||'')
  ||r.owner_id===r.reviewer_id||r.state!=='FROZEN_DENIED'
  ||r.cutover!=='DENY'||r.postrelease!=='DENY'
  ||typeof r.issued_at!=='string'||!Number.isFinite(Date.parse(r.issued_at))
  ||new Date(r.issued_at).toISOString()!==r.issued_at)
  throw Error('Frozen candidate cannot authorize cutover or postrelease');
 return JSON.stringify({schema:r.schema,source_sha:r.source_sha,tree_sha:r.tree_sha,
  artifact_sha256:r.artifact_sha256,image_sha256:r.image_sha256,
  executable_sha256:r.executable_sha256,consent_head_sha256:r.consent_head_sha256,
  original_witness_head_sha256:r.original_witness_head_sha256,
  restore_head_sha256:r.restore_head_sha256,rotation_head_sha256:r.rotation_head_sha256,
  previous_candidate_sha256:r.previous_candidate_sha256,nonce:r.nonce,
  owner_id:r.owner_id,reviewer_id:r.reviewer_id,state:r.state,
  cutover:r.cutover,postrelease:r.postrelease,issued_at:r.issued_at});
}
function signature(pem,msg,sig){try{const k=createPublicKey(pem);return k.asymmetricKeyType==='ed25519'
 &&typeof sig==='string'&&/^[A-Za-z0-9+/]{86}==$/.test(sig)
 &&verify(null,Buffer.from(msg),k,Buffer.from(sig,'base64'));}catch{return false;}}
export function auditP17FrozenCandidate({record,owner_signature,reviewer_signature,
 ownerPublicKeyPem,reviewerPublicKeyPem,pinnedOwnerKeySha256,pinnedReviewerKeySha256,
 independentlyPinnedCandidateSha256,expected,revokedSignerIds=[],now}){
 const msg=canonicalP17Candidate(record);
 if(!expected||!H.test(independentlyPinnedCandidateSha256||'')
  ||sha(msg)!==independentlyPinnedCandidateSha256
  ||!H.test(pinnedOwnerKeySha256||'')||!H.test(pinnedReviewerKeySha256||'')
  ||pinnedOwnerKeySha256===pinnedReviewerKeySha256
  ||sha(ownerPublicKeyPem)!==pinnedOwnerKeySha256||sha(reviewerPublicKeyPem)!==pinnedReviewerKeySha256
  ||!Array.isArray(revokedSignerIds)||revokedSignerIds.includes(record.owner_id)
  ||revokedSignerIds.includes(record.reviewer_id)
  ||!Number.isFinite(Date.parse(now||''))||Date.parse(record.issued_at)>Date.parse(now)
  ||!signature(ownerPublicKeyPem,msg,owner_signature)
  ||!signature(reviewerPublicKeyPem,msg,reviewer_signature))
  throw Error('Candidate external keys, owner separation or frozen hash mismatch');
 for(const k of ['source_sha','tree_sha','artifact_sha256','image_sha256','executable_sha256',
  'consent_head_sha256','original_witness_head_sha256','restore_head_sha256','rotation_head_sha256']){
  if(expected[k]!==record[k])throw Error('Release candidate differs from independently pinned source/custody '+k);
 }
 return {schema:'control-p17-frozen-candidate-audit-v1',candidate_sha256:sha(msg),
  exact_source_sha:record.source_sha,externally_signed_metadata_verified:true,
  image_original_bytes_verified:false,physical_human_acceptance:false,
  real_supabase_recovery_verified:false,precutover_authorized:false,
  postrelease_authorized:false,rollback_authorized:false,
  merge_authorized:false,migration_authorized:false,deployment_authorized:false,
  release_authorized:false,decision:'DENY',state:'FROZEN_DENIED'};
}
