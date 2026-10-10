import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {canonicalP15Consent,auditP15ConsentHistory} from '../src/lib/p15-consent.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const a=generateKeyPairSync('ed25519'),b=generateKeyPairSync('ed25519');
const signerKeys={custodian_one:a.publicKey.export({format:'pem',type:'spki'}),
 independent_auditor:b.publicKey.export({format:'pem',type:'spki'})};
const signerKeyPins=Object.fromEntries(Object.entries(signerKeys).map(([k,v])=>[k,hash(v)]));
const sha='a'.repeat(40),artifact='b'.repeat(64),genesis='0'.repeat(64);
function fixture(){
 let previous=genesis;
 const entries=['grant_claim','revoke_claim'].map((action,i)=>{
  const record={schema:'control-p15-consent-v1',action,source_sha:sha,
   artifact_sha256:artifact,object_sha256:'c'.repeat(64),rights_sha256:'d'.repeat(64),
   evidence_sha256:'e'.repeat(64),previous_sha256:previous,
   nonce:String(i+1).padStart(32,'0'),subject_id:'subject_anonymous',
   custodian_id:'custodian_one',independent_auditor_id:'independent_auditor',
   classification:'UNVERIFIED_EXTERNAL_METADATA',
   issued_at:'2026-10-10T11:'+String(i+10).padStart(2,'0')+':00.000Z'};
  const msg=canonicalP15Consent(record);previous=hash(msg);
  return {record,custodian_signature:sign(null,Buffer.from(msg),a.privateKey).toString('base64'),
   auditor_signature:sign(null,Buffer.from(msg),b.privateKey).toString('base64')};
 });
 return {entries,expectedSourceSha:sha,expectedArtifactSha:artifact,
  pinnedGenesisSha256:genesis,pinnedHeadSha256:previous,signerKeys,signerKeyPins,
  now:'2026-10-10T11:20:00.000Z'};
}
test('synthetic consent claim then revocation is cryptographically consistent, never real consent',()=>{
 const r=auditP15ConsentHistory(fixture());
 assert.equal(r.records_verified,2);assert.equal(r.revoked_claims,1);
 assert.equal(r.unrevoked_claims,0);assert.equal(r.claimed_human_consent_verified,false);
 assert.equal(r.rights_ownership_verified,false);assert.equal(r.release_authorized,false);
});
test('forgery, revoked signer, missing pin, retroactive mutation and fork fail closed',()=>{
 const f=fixture();
 for(const arg of [
  {...f,entries:f.entries.slice(0,1)},
  {...f,entries:[f.entries[0],{...f.entries[1],auditor_signature:'A'.repeat(88)}]},
  {...f,compromisedSignerIds:['custodian_one']},
  {...f,pinnedHeadSha256:'f'.repeat(64)},
  {...f,expectedSourceSha:'f'.repeat(40)},
  {...f,signerKeyPins:{...f.signerKeyPins,independent_auditor:'f'.repeat(64)}},
  {...f,entries:[f.entries[0],{...f.entries[1],record:{...f.entries[1].record,rights_sha256:'f'.repeat(64)}}]},
  {...f,entries:[f.entries[0],{...f.entries[1],record:{...f.entries[1].record,nonce:f.entries[0].record.nonce}}]},
  {...f,now:'2026-10-10T11:00:00.000Z'}
 ])assert.throws(()=>auditP15ConsentHistory(arg));
});
test('revocation before grant, repeated grant and resurrected consent are refused',()=>{
 const f=fixture();
 const invalid={...f,entries:[f.entries[1],f.entries[0]]};
 assert.throws(()=>auditP15ConsentHistory(invalid));
 const duplicate={...f,entries:[f.entries[0],{...f.entries[1],record:{...f.entries[1].record,action:'grant_claim'}}]};
 assert.throws(()=>auditP15ConsentHistory(duplicate));
});
