import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {canonicalP17Rotation,auditP17Rotations} from '../src/lib/p17-rotation.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const root=generateKeyPairSync('ed25519'),pub=root.publicKey.export({type:'spki',format:'pem'});
const source='a'.repeat(40),art='b'.repeat(64),genesis='0'.repeat(64);
function sample(){
 let prev=genesis;
 const records=[['compromise','old_operator',null],['candidate_replacement','old_operator','new_operator']]
  .map(([kind,subject_id,replacement_id],i)=>{
   const record={schema:'control-p17-custodian-rotation-v1',kind,source_sha:source,
    artifact_sha256:art,previous_sha256:prev,external_evidence_sha256:'c'.repeat(64),
    nonce:String(i+1).padStart(32,'0'),subject_id,replacement_id,
    disposition:'REISSUE_AND_EXTERNAL_VERIFICATION_REQUIRED',
    issued_at:'2026-10-10T11:'+String(i+10).padStart(2,'0')+':00.000Z'};
   const msg=canonicalP17Rotation(record);prev=hash(msg);
   return {record,root_signature:sign(null,Buffer.from(msg),root.privateKey).toString('base64')};
  });
 return {events:records,rootPublicKeyPem:pub,pinnedRootSha256:hash(pub),
  pinnedGenesisSha256:genesis,pinnedHeadSha256:prev,
  expectedSourceSha:source,expectedArtifactSha:art,now:'2026-10-10T11:20:00.000Z'};
}
test('root-pinned compromised old signer and candidate replacement stays unapproved',()=>{
 const r=auditP17Rotations(sample());
 assert.equal(r.events_verified,2);assert.deepEqual(r.replacement_candidates_pending,['new_operator']);
 assert.equal(r.externally_reissued_keys_verified,false);assert.equal(r.release_authorized,false);
});
test('wrong root, mutated candidate, invalid chronology, duplicate compromise and forged signature refuse',()=>{
 const s=sample(),e=s.events;
 for(const x of [
  {...s,pinnedRootSha256:'f'.repeat(64)},
  {...s,pinnedHeadSha256:'f'.repeat(64)},
  {...s,expectedSourceSha:'f'.repeat(40)},
  {...s,events:e.slice(0,1)},
  {...s,events:[e[0],{...e[1],root_signature:'A'.repeat(88)}]},
  {...s,events:[e[0],{...e[1],record:{...e[1].record,replacement_id:'old_operator'}}]},
  {...s,events:[e[0],{...e[1],record:{...e[1].record,nonce:e[0].record.nonce}}]},
  {...s,events:[e[1],e[0]]},
  {...s,now:'2026-10-10T11:05:00.000Z'}
 ])assert.throws(()=>auditP17Rotations(x));
});
