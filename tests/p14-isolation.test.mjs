import test from 'node:test';import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {canonicalP14Stage,auditP14DecisionStages} from '../src/lib/p14-isolation.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const keyA=generateKeyPairSync('ed25519'),keyB=generateKeyPairSync('ed25519');
const pub=k=>k.publicKey.export({format:'pem',type:'spki'});
const operators={operator_one:pub(keyA),auditor_two:pub(keyB)};
const operatorKeyPins=Object.fromEntries(Object.entries(operators).map(([id,p])=>[id,hash(p)]));
const source='a'.repeat(40),artifact='b'.repeat(64),witness='c'.repeat(64),genesis='0'.repeat(64);
function build(){
 let previous=genesis;const entries=['precutover','postrelease'].map((stage,i)=>{
  const record={schema:'control-p14-stage-denial-v1',stage,source_sha:source,artifact_sha256:artifact,
   witness_head_sha256:witness,previous_stage_sha256:previous,
   nonce:String(i+1).padStart(32,'0'),operator_id:'operator_one',auditor_id:'auditor_two',
   action:'DENY',issued_at:'2026-10-10T11:'+String(i+10).padStart(2,'0')+':00.000Z'};
  const msg=canonicalP14Stage(record);previous=hash(msg);
  return {record,operator_signature:sign(null,Buffer.from(msg),keyA.privateKey).toString('base64'),
   auditor_signature:sign(null,Buffer.from(msg),keyB.privateKey).toString('base64')};
 });
 return {entries,expectedSourceSha:source,expectedArtifactSha:artifact,
  independentlyPinnedGenesisSha256:genesis,independentlyPinnedHeadSha256:previous,
  independentlyPinnedWitnessHeadSha256:witness,operators,operatorKeyPins,
  now:'2026-10-10T11:20:00.000Z'};
}
test('precutover vs postrelease signed denial chronology stays role-separated and never releases',()=>{
 const r=auditP14DecisionStages(build());
 assert.equal(r.stage_records_verified,2);assert.equal(r.decision,'DENY');
 assert.equal(r.postrelease_authorized,false);assert.equal(r.precutover_authorized,false);
 assert.equal(r.rollback_authorized,false);assert.equal(r.deployment_authorized,false);
});
test('cross-stage signature reuse, reordered timestamps, forged key pin, stale head and stage promotion fail',()=>{
 const f=build();
 for(const x of [
  {...f,entries:[f.entries[1],f.entries[0]]},
  {...f,entries:[f.entries[0],{...f.entries[1],operator_signature:f.entries[0].operator_signature}]},
  {...f,entries:[f.entries[0],{...f.entries[1],record:{...f.entries[1].record,nonce:f.entries[0].record.nonce}}]},
  {...f,entries:[f.entries[0],{...f.entries[1],record:{...f.entries[1].record,action:'APPROVE'}}]},
  {...f,operatorKeyPins:{...f.operatorKeyPins,auditor_two:'f'.repeat(64)}},
  {...f,independentlyPinnedHeadSha256:'f'.repeat(64)},
  {...f,now:'2026-10-10T11:05:00.000Z'}
 ])assert.throws(()=>auditP14DecisionStages(x));
});
