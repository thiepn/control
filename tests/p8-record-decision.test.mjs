import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {generateKeyPairSync,sign} from 'node:crypto';
import {recordOfflineDecision} from '../scripts/p8-record-decision.mjs';
import {canonicalDecision,verifyLedger} from '../src/lib/p8-decision.mjs';
import {REQUIRED_GATES} from '../src/lib/p7-release.mjs';
test('operator ledger persists one valid signature, prevents replay and refuses tampering',()=>{
 const dir=mkdtempSync(join(tmpdir(),'control-p8-ledger-'));
 try{
  const path=join(dir,'ledger.json');
  const {privateKey,publicKey}=generateKeyPairSync('ed25519');
  const doc={schema:'control-p8-decision-v1',source_sha:'a'.repeat(40),
   artifact_sha256:'b'.repeat(64),nonce:'f'.repeat(32),
   decision:'reject',operator:'trusted.test',reason:'Human gates not collected',
   issued_at:'2026-10-10T00:00:00Z',expires_at:'2026-10-10T00:30:00Z',
   gates:REQUIRED_GATES.map(id=>({id,status:'rejected',evidence_sha256:'0'.repeat(64)}))};
  const args={attestation:doc,signature:sign(null,Buffer.from(canonicalDecision(doc)),privateKey).toString('base64'),
   publicKeyPem:publicKey.export({format:'pem',type:'spki'}),sourceSha:doc.source_sha,
   artifactSha:doc.artifact_sha256,now:'2026-10-10T00:10:00Z',ledgerPath:path};
  const outcome=recordOfflineDecision(args);
  assert.equal(outcome.recorded,true);assert.equal(outcome.releaseAuthorized,false);
  assert.equal(outcome.deploymentAuthorized,false);assert.equal(existsSync(path),true);
  const ledger=JSON.parse(readFileSync(path,'utf8'));assert.equal(ledger.entries.length,1);
  verifyLedger(ledger);
  assert.throws(()=>recordOfflineDecision(args),/nonce already consumed/);
  assert.equal(JSON.parse(readFileSync(path,'utf8')).entries.length,1);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('never write operator record into public project source',()=>{
 assert.throws(()=>recordOfflineDecision({ledgerPath:process.cwd()+'/ledger.json'}),/cannot be stored inside/);
});
