import test from 'node:test';import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {canonicalP13Witness} from '../src/lib/p13-witness-intake.mjs';
import {prepareP16PhysicalCustody} from '../src/lib/p16-physical.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex'),zero='0'.repeat(64);
const A=generateKeyPairSync('ed25519'),B=generateKeyPairSync('ed25519');
const reviewerKeys={reviewer_a:A.publicKey.export({type:'spki',format:'pem'}),
 reviewer_b:B.publicKey.export({type:'spki',format:'pem'})};
const reviewerKeyPins=Object.fromEntries(Object.entries(reviewerKeys).map(([k,v])=>[k,hash(v)]));
const source='a'.repeat(40),art='b'.repeat(64),handoff='c'.repeat(64);
function fixture(){
 const surfaces=['android_chrome','ios_safari','nvda','voiceover','rights_provenance','privacy_review'];
 const records=surfaces.map((surface,i)=>({
  schema:'control-p14-handoff-v1',surface,source_sha:source,artifact_sha256:art,
  evidence_sha256:'d'.repeat(64),object_sha256:'e'.repeat(64),rights_sha256:'f'.repeat(64),
  custody_head_sha256:handoff,nonce:String(i+1).padStart(32,'0'),
  reviewer_role:'independent_reviewer',request_id:'request_'+(i+1),
  classification:'REVIEW_REQUEST_ONLY',scope:'OFF_REPO_METADATA_ONLY'}));
 let prev=zero;
 const entries=['android_device','ios_device','screen_reader','source_rights','privacy_review'].map((kind,i)=>{
  const record={schema:'control-p13-witness-intake-v1',kind,
   source_sha:source,artifact_sha256:art,evidence_sha256:'d'.repeat(64),
   object_sha256:'e'.repeat(64),rights_sha256:'f'.repeat(64),
   previous_sha256:prev,nonce:String(i+11).padStart(32,'0'),
   observer_id:'reviewer_a',auditor_id:'reviewer_b',observer_org:'org_a',auditor_org:'org_b',
   classification:'metadata_only_unverified',
   issued_at:'2026-10-10T11:'+String(i+10).padStart(2,'0')+':00.000Z'};
  const msg=canonicalP13Witness(record);prev=hash(msg);
  return {record,observer_signature:sign(null,Buffer.from(msg),A.privateKey).toString('base64'),
   auditor_signature:sign(null,Buffer.from(msg),B.privateKey).toString('base64')};
 });
 return {handoffContext:{records},witnessContext:{entries,pinnedGenesisSha256:zero,
  pinnedHeadSha256:prev,reviewerKeys,reviewerKeyPins},expectedSourceSha:source,
  expectedArtifactSha:art,independentlyPinnedHandoffHead:handoff,
  independentlyPinnedWitnessHead:prev,now:'2026-10-10T11:20:00.000Z'};
}
test('six device/rights requests and five synthetic signed witness classes remain unapproved',()=>{
 const r=prepareP16PhysicalCustody(fixture());
 assert.equal(r.review_requests,6);assert.equal(r.cryptographic_review_claims,5);
 assert.deepEqual(r.pending_real_devices,['android_chrome','ios_safari','nvda','voiceover']);
 assert.equal(r.actual_accessibility_acceptance,false);assert.equal(r.release_authorized,false);
});
test('missing VoiceOver, unsigned reviewer, substituted rights and pinned head reject',()=>{
 const f=fixture();
 for(const x of [
  {...f,handoffContext:{records:f.handoffContext.records.filter(r=>r.surface!=='voiceover')}},
  {...f,witnessContext:{...f.witnessContext,entries:[f.witnessContext.entries[0],
   {...f.witnessContext.entries[1],auditor_signature:'A'.repeat(88)},
   ...f.witnessContext.entries.slice(2)]}},
  {...f,handoffContext:{records:[{...f.handoffContext.records[0],rights_sha256:'1'.repeat(64)},
   ...f.handoffContext.records.slice(1)]}},
  {...f,independentlyPinnedWitnessHead:'f'.repeat(64)}
 ])assert.throws(()=>prepareP16PhysicalCustody(x));
});
