import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {canonicalProvenance,auditProvenanceChain} from '../src/lib/p12-provenance.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const pair=generateKeyPairSync('ed25519'),pem=pair.publicKey.export({format:'pem',type:'spki'});
const source='a'.repeat(40),artifact='b'.repeat(64),genesis='0'.repeat(64);
function sample(){
 let previous=genesis;
 const records=['android_device','source_rights','privacy_review'].map((kind,i)=>{
  const record={schema:'control-p12-provenance-v1',kind,source_sha:source,
   artifact_sha256:artifact,object_sha256:'c'.repeat(64),rights_sha256:'d'.repeat(64),
   previous_record_sha256:previous,evidence_sha256:'e'.repeat(64),
   nonce:String(i+1).padStart(32,'0'),reviewer:'external_reviewer',
   classification:'metadata_only_unverified',
   observed_at:'2026-10-10T11:'+String(i+10).padStart(2,'0')+':00.000Z'};
  const msg=canonicalProvenance(record);previous=hash(msg);
  return {record,signature:sign(null,Buffer.from(msg),pair.privateKey).toString('base64')};
 });
 return {records,pinnedGenesisSha256:genesis,pinnedHeadSha256:previous,
  expectedSourceSha:source,expectedArtifactSha:artifact,
  reviewerKeys:{external_reviewer:pem},now:'2026-10-10T11:20:00.000Z'};
}
test('synthetic physical/rights reviewers only validate chained hashes; never approval',()=>{
 const r=auditProvenanceChain(sample());
 assert.equal(r.records_verified,3);assert.equal(r.rights_granted,false);
 assert.equal(r.physical_approval,false);assert.equal(r.human_acceptance,false);
});
test('replay, forgery, object rights substitution, truncation, missing trust and stale source fail',()=>{
 const s=sample();
 for(const args of [
  {...s,records:s.records.slice(0,2)},
  {...s,pinnedHeadSha256:'f'.repeat(64)},
  {...s,expectedSourceSha:'f'.repeat(40)},
  {...s,reviewerKeys:{}},
  {...s,now:'2026-10-10T11:00:00.000Z'},
  {...s,records:[s.records[0],{...s.records[1],signature:'A'.repeat(88)},s.records[2]]},
  {...s,records:[s.records[0],{...s.records[1],
   record:{...s.records[1].record,object_sha256:'f'.repeat(64)}},s.records[2]]},
  {...s,records:[s.records[0],{...s.records[1],
   record:{...s.records[1].record,nonce:s.records[0].record.nonce}},s.records[2]]}
 ])assert.throws(()=>auditProvenanceChain(args));
});
