import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {canonicalDecision,emptyLedger,reviewOperatorDecision,verifyLedger} from '../src/lib/p8-decision.mjs';
import {REQUIRED_GATES} from '../src/lib/p7-release.mjs';
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const key=publicKey.export({type:'spki',format:'pem'});
const head='a'.repeat(40),artifact='b'.repeat(64);
function signed(changes={}){
 const attestation={schema:'control-p8-decision-v1',source_sha:head,artifact_sha256:artifact,
 nonce:'c'.repeat(32),decision:'approve_review_only',operator:'trusted.operator',
 reason:'External review signed after independent verification',
 issued_at:'2026-10-10T00:00:00Z',expires_at:'2026-10-10T00:30:00Z',
 gates:REQUIRED_GATES.map(id=>({id,status:'accepted',evidence_sha256:'d'.repeat(64)})),...changes};
 const signature=sign(null,Buffer.from(canonicalDecision(attestation)),privateKey).toString('base64');
 return {attestation,signature,publicKeyPem:key,sourceSha:head,
  artifactSha:artifact,now:'2026-10-10T00:15:00Z',ledger:emptyLedger()};
}
test('valid externally signed offline record is source-bound but still cannot deploy',()=>{
 const r=reviewOperatorDecision(signed());
 assert.equal(r.recordable,true);assert.equal(r.releaseAuthorized,false);
 assert.equal(r.deploymentAuthorized,false);
 const ledger=emptyLedger();ledger.entries.push(r.entry);
 assert.equal(verifyLedger(ledger),r.entry.entry_sha256);
 assert.equal(reviewOperatorDecision({...signed(),ledger}).recordable,false);
});
test('reject source substitution, forged payload, wrong signer, missing approval and expiry',()=>{
 const base=signed();
 for(const input of [
  {...base,sourceSha:'e'.repeat(40)},
  {...base,artifactSha:'f'.repeat(64)},
  {...base,signature:'a'.repeat(88)},
  {...base,publicKeyPem:''},
  {...base,now:'2026-10-10T01:00:00Z'},
  {...base,attestation:{...base.attestation,reason:'silently changed'}},
  {...base,attestation:{...base.attestation,gates:base.attestation.gates.map((g,i)=>i?g:{...g,status:'rejected'})}}
 ])assert.equal(reviewOperatorDecision(input).recordable,false);
});
test('append-only ledger detects reordering, removal-linked hashes and duplicate nonces',()=>{
 const base=signed(),r=reviewOperatorDecision(base),ledger=emptyLedger();
 ledger.entries.push(r.entry);
 const modified=structuredClone(ledger);modified.entries[0].source_sha='e'.repeat(40);
 assert.throws(()=>verifyLedger(modified));
 const dup=structuredClone(ledger);dup.entries.push({...r.entry,index:1});
 assert.throws(()=>verifyLedger(dup));
 assert.throws(()=>canonicalDecision({...base.attestation,nonce:'short'}));
});
test('signed rejection can be recorded even when evidence is unapproved, without releasing',()=>{
 const x=signed({decision:'reject',gates:REQUIRED_GATES.map(id=>({id,status:'rejected',evidence_sha256:'0'.repeat(64)}))});
 const result=reviewOperatorDecision(x);
 assert.equal(result.recordable,true);assert.equal(result.releaseAuthorized,false);
});
