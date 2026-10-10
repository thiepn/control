import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {canonicalIncident,auditCompromiseChronology} from '../src/lib/p12-compromise.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const root=generateKeyPairSync('ed25519'),pem=root.publicKey.export({format:'pem',type:'spki'});
const sha='a'.repeat(40),art='b'.repeat(64),genesis='0'.repeat(64);
function fixture(){
 const specs=[['compromise','reviewer_old',null],['recovery','reviewer_old','reviewer_new'],
  ['revocation','reviewer_old',null]];
 let prev=genesis;
 const events=specs.map(([kind,subject_key_id,replacement_key_id],i)=>{
  const record={schema:'control-p12-incident-v1',sequence:i,kind,previous_sha256:prev,
   nonce:String(i+1).padStart(64,'0'),evidence_sha256:'d'.repeat(64),
   source_sha:sha,artifact_sha256:art,subject_key_id,replacement_key_id,
   effective_at:'2026-10-10T11:'+String(i+10).padStart(2,'0')+':00.000Z'};
  const msg=canonicalIncident(record);prev=hash(msg);
  return {record,root_signature:sign(null,Buffer.from(msg),root.privateKey).toString('base64')};
 });
 return {events,rootPublicKeyPem:pem,pinnedRootSha256:hash(pem),
  pinnedGenesisSha256:genesis,pinnedHeadSha256:prev,expectedSourceSha:sha,
  expectedArtifactSha:art,now:'2026-10-10T11:20:00.000Z'};
}
test('synthetic root-pinned compromise -> recovery -> revocation produces no release authorization',()=>{
 const r=auditCompromiseChronology(fixture());
 assert.equal(r.events_verified,3);assert.deepEqual(r.compromised_key_ids,['reviewer_old']);
 assert.deepEqual(r.revoked_key_ids,['reviewer_old']);assert.equal(r.release_authorized,false);
});
test('truncation, replay, bad root, time swap, compromised replacement and fork refuse',()=>{
 const f=fixture();
 for(const arg of [
  {...f,events:f.events.slice(0,2)},
  {...f,pinnedHeadSha256:'f'.repeat(64)},
  {...f,pinnedRootSha256:'f'.repeat(64)},
  {...f,expectedArtifactSha:'e'.repeat(64)},
  {...f,now:'2026-10-10T11:09:00.000Z'},
  {...f,events:[f.events[0],{...f.events[1],root_signature:'A'.repeat(88)},f.events[2]]},
  {...f,events:[f.events[0],{...f.events[1],record:{...f.events[1].record,
   replacement_key_id:'reviewer_old'}},f.events[2]]},
  {...f,events:[f.events[0],{...f.events[1],record:{...f.events[1].record,
   nonce:f.events[0].record.nonce}},f.events[2]]}
 ])assert.throws(()=>auditCompromiseChronology(arg));
});
