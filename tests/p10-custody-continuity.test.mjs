import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {emptyLedger,canonicalDecision,reviewOperatorDecision,sha256} from '../src/lib/p8-decision.mjs';
import {canonicalCheckpoint} from '../src/lib/p9-custody.mjs';
import {verifyCustodyContinuity} from '../src/lib/p10-custody-continuity.mjs';
import {REQUIRED_GATES} from '../src/lib/p7-release.mjs';
const s='a'.repeat(40),a='b'.repeat(64),anchor='0'.repeat(64);
const {privateKey:operator,publicKey:operatorPub}=generateKeyPairSync('ed25519');
const {privateKey:custodian,publicKey:custodianPub}=generateKeyPairSync('ed25519');
const publicKeyPem=custodianPub.export({format:'pem',type:'spki'});
function fixture(){
 const ledger=emptyLedger();
 for(let i=0;i<2;i++){
  const d={schema:'control-p8-decision-v1',source_sha:s,artifact_sha256:a,
   nonce:String(i+1).padStart(32,'0'),decision:'reject',operator:'independent.test',
   reason:'Synthetic rejection',issued_at:'2026-10-10T10:00:00Z',
   expires_at:'2026-10-10T10:30:00Z',
   gates:REQUIRED_GATES.map(id=>({id,status:'rejected',evidence_sha256:'f'.repeat(64)}))};
  const signature=sign(null,Buffer.from(canonicalDecision(d)),operator).toString('base64');
  const x=reviewOperatorDecision({attestation:d,signature,
   publicKeyPem:operatorPub.export({format:'pem',type:'spki'}),sourceSha:s,
   artifactSha:a,now:'2026-10-10T10:15:00Z',ledger});
  assert.equal(x.recordable,true);ledger.entries.push(x.entry);
 }
 const make=(count,previous_checkpoint_sha256,issued_at)=>({
  schema:'control-p9-custody-v1',source_sha:s,artifact_sha256:a,
  ledger_head_sha256:ledger.entries[count-1].entry_sha256,
  previous_checkpoint_sha256,entry_count:count,
  nonce:String(count+10).padStart(32,'0'),custodian:'independent.audit',issued_at});
 const previous=make(1,anchor,'2026-10-10T10:35:00.000Z');
 const prevSignature=sign(null,Buffer.from(canonicalCheckpoint(previous)),custodian).toString('base64');
 const previousHash=sha256(canonicalCheckpoint(previous));
 const current=make(2,previousHash,'2026-10-10T10:40:00.000Z');
 const currentSignature=sign(null,Buffer.from(canonicalCheckpoint(current)),custodian).toString('base64');
 return {ledger,previous,current,previousSignature:prevSignature,currentSignature,
  trustedPublicKeyPem:publicKeyPem,previousAnchorSha256:anchor,
  previousSourceSha:s,previousArtifactSha:a,currentSourceSha:s,currentArtifactSha:a,
  now:'2026-10-10T10:45:00.000Z'};
}
test('two successive custodian-signed checkpoints prove ledger continuity but never release',()=>{
 const result=verifyCustodyContinuity(fixture());
 assert.equal(result.verified,true);assert.equal(result.delta_entries,1);
 assert.equal(result.releaseAuthorized,false);assert.equal(result.deploymentAuthorized,false);
});
test('truncation, replay, missing independently pinned anchor, tamper and wrong signer refuse',()=>{
 const f=fixture();
 for(const input of [
  {...f,ledger:{...f.ledger,entries:f.ledger.entries.slice(0,1)}},
  {...f,previousAnchorSha256:'e'.repeat(64)},
  {...f,currentSignature:f.previousSignature},
  {...f,current:{...f.current,entry_count:1}},
  {...f,current:{...f.current,nonce:f.previous.nonce}},
  {...f,current:{...f.current,issued_at:f.previous.issued_at}}
 ])assert.throws(()=>verifyCustodyContinuity(input));
});
