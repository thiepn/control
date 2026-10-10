import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {REQUIRED_GATES} from '../src/lib/p7-release.mjs';
import {canonicalEvidence,assessHumanEvidence,composeReleaseProposal} from '../src/lib/p10-evidence.mjs';
const pair=generateKeyPairSync('ed25519'),pem=pair.publicKey.export({format:'pem',type:'spki'});
const head='a'.repeat(40),art='b'.repeat(64),now='2026-10-10T12:00:00.000Z';
function receipt(gate,index){
 const record={schema:'control-p10-evidence-v1',gate,source_sha:head,artifact_sha256:art,
 evidence_sha256:'c'.repeat(64),nonce:index.toString(16).padStart(32,'0'),
 reviewer:'independent.auditor',classification:'independently_reviewed',
 status:'accepted_for_review',issued_at:'2026-10-10T11:00:00.000Z',
 expires_at:'2026-10-10T12:30:00.000Z'};
 // correct max-hour duration before signing
 record.issued_at='2026-10-10T11:31:00.000Z';
 return {record,signature:sign(null,Buffer.from(canonicalEvidence(record)),pair.privateKey).toString('base64')};
}
const args=(records)=>({records,sourceSha:head,artifactSha:art,now,
 trustedReviewers:{'independent.auditor':pem}});
test('missing physical and human records keep all real-world gates open',()=>{
 const x=assessHumanEvidence(args([]));
 assert.equal(x.reviewed_gate_count,0);assert.equal(x.missing_gates.length,7);
 assert.equal(x.eligibleForManualReview,false);assert.equal(x.releaseAuthorized,false);
 const p=composeReleaseProposal({humanEvidence:x,custodyVerified:true,
  sourceVerified:true,binaryVerified:true,isolatedRestoreVerified:true,
  explicitReleaseAuthorization:true});
 assert.equal(p.decision,'DENY');assert.equal(p.deployment_authorized,false);
 assert.equal(p.missing_gates.length,8);assert.equal(p.explicitReleaseAuthorizationIgnored,true);
});
test('even seven valid artificial external signatures cannot create release authorization',()=>{
 const x=assessHumanEvidence(args(REQUIRED_GATES.map(receipt)));
 assert.equal(x.eligibleForManualReview,true);assert.equal(x.reviewed_gate_count,7);
 const p=composeReleaseProposal({humanEvidence:x,custodyVerified:true,
  sourceVerified:true,binaryVerified:true,isolatedRestoreVerified:true});
 assert.equal(p.human_review_eligible,true);assert.deepEqual(p.missing_gates,['separate_authorized_release_command']);
 assert.equal(p.decision,'DENY');assert.equal(p.merge_authorized,false);
});
test('forgeries, source swap, expired, untrusted signers and duplicate nonce fail closed',()=>{
 const one=receipt(REQUIRED_GATES[0],1);
 for(const opt of [
  {...args([one]),sourceSha:'d'.repeat(40)},
  {...args([one]),artifactSha:'e'.repeat(64)},
  {...args([one]),trustedReviewers:{}},
  {...args([one]),now:'2026-10-10T14:00:00.000Z'},
  args([{...one,signature:'a'.repeat(88)}]),
  args([one,one]),
  args([one,{...receipt(REQUIRED_GATES[1],2),record:{...receipt(REQUIRED_GATES[1],2).record,nonce:one.record.nonce}}])
 ])assert.throws(()=>assessHumanEvidence(opt));
 assert.throws(()=>canonicalEvidence({...one.record,classification:'self_reported_unverified'}));
});
