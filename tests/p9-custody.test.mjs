import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {emptyLedger,reviewOperatorDecision,canonicalDecision,sha256} from '../src/lib/p8-decision.mjs';
import {REQUIRED_GATES} from '../src/lib/p7-release.mjs';
import {canonicalCheckpoint,verifyIndependentCustody} from '../src/lib/p9-custody.mjs';
const sourceSha='a'.repeat(40),artifactSha='b'.repeat(64),pin='0'.repeat(64);
const operator=generateKeyPairSync('ed25519'),custodian=generateKeyPairSync('ed25519');
const pem=custodian.publicKey.export({type:'spki',format:'pem'});
function sample(){
 const attestation={schema:'control-p8-decision-v1',source_sha:sourceSha,artifact_sha256:artifactSha,
  nonce:'c'.repeat(32),decision:'reject',operator:'trusted.test',reason:'No real acceptance',
  issued_at:'2026-10-10T00:00:00Z',expires_at:'2026-10-10T00:30:00Z',
  gates:REQUIRED_GATES.map(id=>({id,status:'rejected',evidence_sha256:'d'.repeat(64)}))};
 const sig=sign(null,Buffer.from(canonicalDecision(attestation)),operator.privateKey).toString('base64');
 const ledger=emptyLedger(),r=reviewOperatorDecision({attestation,signature:sig,
  publicKeyPem:operator.publicKey.export({type:'spki',format:'pem'}),sourceSha,artifactSha,
  now:'2026-10-10T00:10:00Z',ledger});
 assert.equal(r.recordable,true);ledger.entries.push(r.entry);
 const checkpoint={schema:'control-p9-custody-v1',source_sha:sourceSha,artifact_sha256:artifactSha,
  ledger_head_sha256:r.entry.entry_sha256,previous_checkpoint_sha256:pin,
  entry_count:1,nonce:'f'.repeat(32),custodian:'external.audit',
  issued_at:'2026-10-10T00:15:00.000Z'};
 const signature=sign(null,Buffer.from(canonicalCheckpoint(checkpoint)),custodian.privateKey).toString('base64');
 return {checkpoint,signature,publicKeyPem:pem,ledger,sourceSha,artifactSha,
  pinnedPreviousCheckpointSha256:pin,now:'2026-10-10T00:20:00.000Z'};
}
test('independently signed external custody preserves exact ledger identity but cannot deploy',()=>{
 const r=verifyIndependentCustody(sample());
 assert.equal(r.verified,true);assert.equal(r.releaseAuthorized,false);
 assert.equal(r.deploymentAuthorized,false);assert.match(r.checkpoint_sha256,/^[a-f0-9]{64}$/);
});
test('missing anchor pin, truncation, forged data, wrong signer and source swap fail closed',()=>{
 const s=sample();
 for(const v of [
  {...s,pinnedPreviousCheckpointSha256:undefined},
  {...s,pinnedPreviousCheckpointSha256:'f'.repeat(64)},
  {...s,ledger:emptyLedger()},
  {...s,sourceSha:'e'.repeat(40)},
  {...s,artifactSha:'e'.repeat(64)},
  {...s,now:'2026-10-09T00:00:00.000Z'},
  {...s,signature:Buffer.alloc(64).toString('base64')},
  {...s,publicKeyPem:operator.publicKey.export({type:'spki',format:'pem'})},
  {...s,checkpoint:{...s.checkpoint,entry_count:2}},
  {...s,checkpoint:{...s.checkpoint,previous_checkpoint_sha256:sha256('forged')}}
 ])assert.throws(()=>verifyIndependentCustody(v));
});
test('malformed checkpoints and ledger mutation do not pass',()=>{
 const s=sample();
 assert.throws(()=>canonicalCheckpoint({...s.checkpoint,issued_at:'tomorrow'}));
 const changed=structuredClone(s);changed.ledger.entries[0].entry_sha256='f'.repeat(64);
 assert.throws(()=>verifyIndependentCustody(changed));
});
