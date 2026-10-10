import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {canonicalWitness,verifyExternalWitness,defaultDeniedP12} from '../src/lib/p12-witness.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const pair=generateKeyPairSync('ed25519'),pem=pair.publicKey.export({format:'pem',type:'spki'});
const source='a'.repeat(40),art='b'.repeat(64),custody='c'.repeat(64);
function sample(){
 const record={schema:'control-p12-external-witness-v1',kind:'disposable_restore',
  source_sha:source,artifact_sha256:art,observed_evidence_sha256:'d'.repeat(64),
  custody_pin_sha256:custody,nonce:'e'.repeat(64),witness_id:'external_witness',
  disposition:'REVIEW_ONLY',observed_at:'2026-10-10T11:10:00.000Z'};
 return {record,signature:sign(null,Buffer.from(canonicalWitness(record)),pair.privateKey).toString('base64'),
  witnessPublicKeyPem:pem,pinnedWitnessKeySha256:hash(pem),pinnedCustodySha256:custody,
  expectedSourceSha:source,expectedArtifactSha:art,now:'2026-10-10T11:20:00.000Z'};
}
test('trusted synthetic witness verifies metadata but does NOT claim real restore',()=>{
 const r=verifyExternalWitness(sample());
 assert.equal(r.signed_metadata_verified,true);assert.equal(r.real_operation_confirmed,false);
 assert.equal(r.external_operator_approved,false);assert.equal(r.release_authorized,false);
});
test('wrong root, unsigned future, forged operation and artifact swaps refuse',()=>{
 const s=sample();
 for(const x of [
  {...s,pinnedWitnessKeySha256:'0'.repeat(64)},
  {...s,pinnedCustodySha256:'0'.repeat(64)},
  {...s,expectedArtifactSha:'0'.repeat(64)},
  {...s,now:'2026-10-10T11:00:00.000Z'},
  {...s,signature:'A'.repeat(88)},
  {...s,record:{...s.record,disposition:'APPROVED'}},
  {...s,record:{...s.record,kind:'unknown'}}
 ])assert.throws(()=>verifyExternalWitness(x));
});
test('closure includes 16 open human/real-world prerequisites and never permits operation',()=>{
 const r=defaultDeniedP12({sourceSha:source,artifactSha:art});
 assert.equal(r.decision,'DENY');assert.equal(r.missing.length,16);
 assert.equal(r.release_authorized,false);assert.equal(r.human_signoff,'NOT_COLLECTED');
 assert.throws(()=>defaultDeniedP12({sourceSha:'foo',artifactSha:art}));
});
