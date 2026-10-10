import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {p17sha,canonicalP17Original,auditP17OriginalWitnesses} from '../src/lib/p17-governance.mjs';
const A=generateKeyPairSync('ed25519'),B=generateKeyPairSync('ed25519');
const pk=k=>k.publicKey.export({type:'spki',format:'pem'}),signed=(msg,k)=>sign(null,Buffer.from(msg),k.privateKey).toString('base64');
const signerKeys={observer_one:pk(A),auditor_two:pk(B)};
const signerKeyPins=Object.fromEntries(Object.entries(signerKeys).map(([k,v])=>[k,p17sha(v)]));
const source='a'.repeat(40),artifact='b'.repeat(64),candidate='c'.repeat(64),genesis='0'.repeat(64);
const kinds=['consent_rights','android_chrome','ios_safari','nvda','voiceover','privacy_review'];
function sample(){
 let prev=genesis;
 const records=kinds.map((kind,i)=>{
  const record={schema:'control-p17-original-witness-v1',kind,source_sha:source,
   artifact_sha256:artifact,frozen_candidate_sha256:candidate,
   original_bytes_sha256:String(i+1).padStart(64,'a'),object_sha256:'d'.repeat(64),
   rights_sha256:'e'.repeat(64),previous_sha256:prev,
   nonce:String(i+1).padStart(32,'0'),observer_id:'observer_one',
   adjudicator_id:'auditor_two',observer_org:'org_one',adjudicator_org:'org_two',
   classification:'UNVERIFIED_ORIGINAL_EVIDENCE_CLAIM',
   issued_at:'2026-10-10T11:'+String(i+10).padStart(2,'0')+':00.000Z'};
  const msg=canonicalP17Original(record);prev=p17sha(msg);
  return {record,observer_signature:signed(msg,A),adjudicator_signature:signed(msg,B)};
 });
 return {records,expectedSourceSha:source,expectedArtifactSha:artifact,
  pinnedCandidateSha256:candidate,pinnedGenesisSha256:genesis,
  pinnedHeadSha256:prev,signerKeys,signerKeyPins,now:'2026-10-10T11:30:00.000Z'};
}
test('six distinct original-hash metadata claims verify, but no actual devices, consent, or rights',()=>{
 const r=auditP17OriginalWitnesses(sample());
 assert.equal(r.claims_verified,6);assert.equal(r.original_byte_claims_distinct,6);
 assert.equal(r.actual_human_consent_verified,false);assert.equal(r.physical_tests_performed,false);
 assert.equal(r.release_authorized,false);
});
test('forgery, nonce replay, original reuse, rights swap, compromised signer and stale pin refuse',()=>{
 const s=sample(),records=s.records;
 for(const x of [
  {...s,records:records.slice(0,5)},
  {...s,revokedSignerIds:['observer_one']},
  {...s,pinnedHeadSha256:'f'.repeat(64)},
  {...s,pinnedCandidateSha256:'f'.repeat(64)},
  {...s,signerKeyPins:{...s.signerKeyPins,auditor_two:s.signerKeyPins.observer_one}},
  {...s,records:[records[0],{...records[1],adjudicator_signature:'A'.repeat(88)},...records.slice(2)]},
  {...s,records:[records[0],{...records[1],record:{...records[1].record,rights_sha256:'f'.repeat(64)}},...records.slice(2)]},
  {...s,records:[records[0],{...records[1],record:{...records[1].record,original_bytes_sha256:records[0].record.original_bytes_sha256}},...records.slice(2)]},
  {...s,records:[records[0],{...records[1],record:{...records[1].record,nonce:records[0].record.nonce}},...records.slice(2)]},
  {...s,records:[records[1],records[0],...records.slice(2)]},
  {...s,now:'2026-10-10T11:08:00.000Z'}
 ])assert.throws(()=>auditP17OriginalWitnesses(x));
});
