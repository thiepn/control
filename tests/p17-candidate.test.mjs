import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {canonicalP17Candidate,auditP17FrozenCandidate} from '../src/lib/p17-candidate.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const a=generateKeyPairSync('ed25519'),b=generateKeyPairSync('ed25519'),
 ownerPublicKeyPem=a.publicKey.export({type:'spki',format:'pem'}),
 reviewerPublicKeyPem=b.publicKey.export({type:'spki',format:'pem'});
function sample(){
 const record={schema:'control-p17-frozen-candidate-v1',source_sha:'a'.repeat(40),
  tree_sha:'b'.repeat(40),artifact_sha256:'c'.repeat(64),image_sha256:'d'.repeat(64),
  executable_sha256:'e'.repeat(64),consent_head_sha256:'f'.repeat(64),
  original_witness_head_sha256:'1'.repeat(64),restore_head_sha256:'2'.repeat(64),
  rotation_head_sha256:'3'.repeat(64),previous_candidate_sha256:'0'.repeat(64),
  nonce:'4'.repeat(32),owner_id:'owner_one',reviewer_id:'reviewer_two',
  state:'FROZEN_DENIED',cutover:'DENY',postrelease:'DENY',issued_at:'2026-10-10T11:10:00.000Z'};
 const msg=canonicalP17Candidate(record);
 return {record,owner_signature:sign(null,Buffer.from(msg),a.privateKey).toString('base64'),
  reviewer_signature:sign(null,Buffer.from(msg),b.privateKey).toString('base64'),
  ownerPublicKeyPem,reviewerPublicKeyPem,pinnedOwnerKeySha256:hash(ownerPublicKeyPem),
  pinnedReviewerKeySha256:hash(reviewerPublicKeyPem),
  independentlyPinnedCandidateSha256:hash(msg),expected:{...record},
  now:'2026-10-10T11:20:00.000Z'};
}
test('frozen independent owner/reviewer metadata is immutably denied',()=>{
 const r=auditP17FrozenCandidate(sample());
 assert.equal(r.state,'FROZEN_DENIED');assert.equal(r.decision,'DENY');
 assert.equal(r.release_authorized,false);assert.equal(r.postrelease_authorized,false);
 assert.equal(r.image_original_bytes_verified,false);
});
test('revoked signer, altered source/image, approval mutation, role collision and wrong pin refuse',()=>{
 const s=sample();
 for(const x of [
  {...s,revokedSignerIds:['owner_one']},
  {...s,expected:{...s.expected,image_sha256:'8'.repeat(64)}},
  {...s,independentlyPinnedCandidateSha256:'0'.repeat(64)},
  {...s,pinnedReviewerKeySha256:s.pinnedOwnerKeySha256},
  {...s,reviewer_signature:'A'.repeat(88)},
  {...s,record:{...s.record,state:'APPROVED'}},
  {...s,record:{...s.record,cutover:'APPROVE'}},
  {...s,record:{...s.record,reviewer_id:'owner_one'}},
  {...s,now:'2026-10-10T11:01:00.000Z'}
 ])assert.throws(()=>auditP17FrozenCandidate(x));
});
