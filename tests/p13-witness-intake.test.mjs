import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {canonicalP13Witness,auditP13WitnessIntake,p13Sha256} from '../src/lib/p13-witness-intake.mjs';
const keys={alice:generateKeyPairSync('ed25519'),bob:generateKeyPairSync('ed25519')};
const pub=k=>keys[k].publicKey.export({format:'pem',type:'spki'});
const reviewerKeys={alice:pub('alice'),bob:pub('bob')};
const reviewerKeyPins=Object.fromEntries(Object.entries(reviewerKeys).map(([id,p])=>[id,p13Sha256(p)]));
const source='a'.repeat(40),artifact='b'.repeat(64),genesis='0'.repeat(64);
function fixture(){
 let previous=genesis;
 const entries=['android_device','source_rights'].map((kind,i)=>{
  const record={schema:'control-p13-witness-intake-v1',kind,source_sha:source,
   artifact_sha256:artifact,evidence_sha256:'c'.repeat(64),
   object_sha256:'d'.repeat(64),rights_sha256:'e'.repeat(64),
   previous_sha256:previous,nonce:String(i+1).padStart(32,'0'),
   observer_id:'alice',auditor_id:'bob',observer_org:'org_a',auditor_org:'org_b',
   classification:'metadata_only_unverified',
   issued_at:'2026-10-10T11:'+String(i+10).padStart(2,'0')+':00.000Z'};
  const msg=canonicalP13Witness(record);previous=p13Sha256(msg);
  return {record,observer_signature:sign(null,Buffer.from(msg),keys.alice.privateKey).toString('base64'),
   auditor_signature:sign(null,Buffer.from(msg),keys.bob.privateKey).toString('base64')};
 });
 return {entries,pinnedGenesisSha256:genesis,pinnedHeadSha256:previous,
  expectedSourceSha:source,expectedArtifactSha:artifact,reviewerKeys,reviewerKeyPins,
  now:'2026-10-10T11:20:00.000Z'};
}
test('dual independent synthetic custody verifies metadata, not physical act or rights approval',()=>{
 const r=auditP13WitnessIntake(fixture());
 assert.equal(r.records_verified,2);assert.equal(r.cryptographic_metadata_verified,true);
 assert.equal(r.physical_device_verified,false);assert.equal(r.rights_ownership_verified,false);
 assert.equal(r.release_authorized,false);
});
test('truncation, forgery, unpinned key, object rights swap, nonce replay, same identity fail',()=>{
 const f=fixture();
 for(const v of [
  {...f,entries:f.entries.slice(0,1)},
  {...f,expectedSourceSha:'f'.repeat(40)},
  {...f,reviewerKeyPins:{...f.reviewerKeyPins,bob:'f'.repeat(64)}},
  {...f,entries:[f.entries[0],{...f.entries[1],auditor_signature:'A'.repeat(88)}]},
  {...f,entries:[f.entries[0],{...f.entries[1],record:{...f.entries[1].record,rights_sha256:'f'.repeat(64)}}]},
  {...f,entries:[f.entries[0],{...f.entries[1],record:{...f.entries[1].record,nonce:f.entries[0].record.nonce}}]},
  {...f,entries:[{...f.entries[0],record:{...f.entries[0].record,auditor_org:'org_a'}},f.entries[1]]},
  {...f,now:'2026-10-10T11:09:00.000Z'}
 ])assert.throws(()=>auditP13WitnessIntake(v));
});
