import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {canonicalP13Decision,reviewP13OperatorAcknowledgment} from '../src/lib/p13-decision-separation.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const owner=generateKeyPairSync('ed25519'),audit=generateKeyPairSync('ed25519');
const ownerPublicKeyPem=owner.publicKey.export({format:'pem',type:'spki'});
const auditorPublicKeyPem=audit.publicKey.export({format:'pem',type:'spki'});
const head='a'.repeat(40),art='b'.repeat(64),trust='c'.repeat(64),witness='d'.repeat(64);
function sample(){
 const record={schema:'control-p13-owner-review-v1',source_sha:head,artifact_sha256:art,
  witness_head_sha256:witness,trust_head_sha256:trust,
  nonce:'1'.repeat(32),owner_id:'owner_one',auditor_id:'external_auditor',
  action:'REVIEW_ONLY_DENY',issued_at:'2026-10-10T11:10:00.000Z'};
 const msg=canonicalP13Decision(record);
 return {record,owner_signature:sign(null,Buffer.from(msg),owner.privateKey).toString('base64'),
  auditor_signature:sign(null,Buffer.from(msg),audit.privateKey).toString('base64'),
  ownerPublicKeyPem,auditorPublicKeyPem,pinnedOwnerKeySha256:sha(ownerPublicKeyPem),
  pinnedAuditorKeySha256:sha(auditorPublicKeyPem),expectedSourceSha:head,
  expectedArtifactSha:art,pinnedWitnessHeadSha256:witness,pinnedTrustHeadSha256:trust,
  now:'2026-10-10T11:20:00.000Z'};
}
test('two signed nonrelease review acknowledgments never permit merge deploy or migration',()=>{
 const r=reviewP13OperatorAcknowledgment(sample());
 assert.equal(r.signatures_verified,2);assert.equal(r.decision,'DENY');
 assert.equal(r.release_authorized,false);assert.equal(r.deployment_authorized,false);
});
test('source/head substitution, same signer, expired clock, forged signature and APPROVE fail closed',()=>{
 const s=sample();
 for(const v of [
  {...s,pinnedWitnessHeadSha256:'0'.repeat(64)},
  {...s,expectedArtifactSha:'f'.repeat(64)},
  {...s,pinnedAuditorKeySha256:s.pinnedOwnerKeySha256},
  {...s,now:'2026-10-10T12:00:00.000Z'},
  {...s,auditor_signature:'A'.repeat(88)},
  {...s,record:{...s.record,action:'APPROVE'}},
  {...s,record:{...s.record,auditor_id:s.record.owner_id}}
 ])assert.throws(()=>reviewP13OperatorAcknowledgment(v));
});
