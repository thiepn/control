import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {canonicalP15Freeze,auditP15Freeze} from '../src/lib/p15-freeze.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const owner=generateKeyPairSync('ed25519'),reviewer=generateKeyPairSync('ed25519');
const signerKeys={owner_one:owner.publicKey.export({format:'pem',type:'spki'}),
 reviewer_two:reviewer.publicKey.export({format:'pem',type:'spki'})};
const signerKeyPins=Object.fromEntries(Object.entries(signerKeys).map(([k,v])=>[k,hash(v)]));
const source='a'.repeat(40),artifact='b'.repeat(64),consent='c'.repeat(64),image='d'.repeat(64),genesis='0'.repeat(64);
function fixture(){
 let previous=genesis;
 const entries=['precutover_freeze','postrelease_rollback_hold'].map((stage,i)=>{
  const record={schema:'control-p15-freeze-v1',stage,action:'DENY',
   source_sha:source,artifact_sha256:artifact,consent_head_sha256:consent,
   image_sha256:image,previous_sha256:previous,nonce:String(i+1).padStart(32,'0'),
   owner_id:'owner_one',independent_reviewer_id:'reviewer_two',
   issued_at:'2026-10-10T11:'+String(i+10).padStart(2,'0')+':00.000Z'};
  const msg=canonicalP15Freeze(record);previous=hash(msg);
  return {record,owner_signature:sign(null,Buffer.from(msg),owner.privateKey).toString('base64'),
   reviewer_signature:sign(null,Buffer.from(msg),reviewer.privateKey).toString('base64')};
 });
 return {entries,expectedSourceSha:source,expectedArtifactSha:artifact,
  independentlyPinnedConsentHead:consent,independentlyPinnedImageSha256:image,
  independentlyPinnedGenesisSha256:genesis,independentlyPinnedFinalSha256:previous,
  signerKeys,signerKeyPins,now:'2026-10-10T11:20:00.000Z'};
}
test('independent synthetic freeze and postrelease hold both deny operational changes',()=>{
 const v=auditP15Freeze(fixture());assert.equal(v.stage_records_verified,2);
 assert.equal(v.freeze_state,'HOLD');assert.equal(v.release_authorized,false);
 assert.equal(v.rollback_authorized,false);assert.equal(v.postrelease_accepted,false);
});
test('expired/revoked signer, forged freeze, wrong image and stage replay fail',()=>{
 const f=fixture();
 for(const a of [
  {...f,revokedSignerIds:['owner_one']},
  {...f,independentlyPinnedImageSha256:'0'.repeat(64)},
  {...f,independentlyPinnedFinalSha256:'0'.repeat(64)},
  {...f,entries:[f.entries[1],f.entries[0]]},
  {...f,entries:[f.entries[0],{...f.entries[1],owner_signature:'A'.repeat(88)}]},
  {...f,entries:[f.entries[0],{...f.entries[1],record:{...f.entries[1].record,nonce:f.entries[0].record.nonce}}]},
  {...f,entries:[f.entries[0],{...f.entries[1],record:{...f.entries[1].record,action:'APPROVE'}}]},
  {...f,signerKeyPins:{...f.signerKeyPins,reviewer_two:f.signerKeyPins.owner_one}},
  {...f,now:'2026-10-10T11:00:00.000Z'}
 ])assert.throws(()=>auditP15Freeze(a));
});
