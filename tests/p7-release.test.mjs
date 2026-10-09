import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {validateDeviceReceipt,canonicalAttestation,evaluateSignedReadiness,REQUIRED_GATES} from '../src/lib/p7-release.mjs';
const sha='a'.repeat(40),artifact='b'.repeat(64);
test('device receipts only record unverified metadata with strict SHA and bound length',()=>{
 const r=validateDeviceReceipt({surface:'nvda',source_sha:sha,evidence_sha256:artifact,observation:'Synthetic note'});
 assert.equal(r.classification,'self_reported_unverified');
 assert.throws(()=>validateDeviceReceipt({...r,source_sha:'bad'}));
 assert.throws(()=>validateDeviceReceipt({...r,observation:'secret\nnewline'}));
 assert.throws(()=>validateDeviceReceipt({...r,observation:'x'.repeat(501)}));
});
test('operator signature is pinned to exact source, artifact, expiry and mandatory gates',()=>{
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const att={schema:'control-p7-operator-v1',source_sha:sha,artifact_sha256:artifact,
  gates:[...REQUIRED_GATES],operator:'operator.test',issued_at:'2026-10-10T00:00:00Z',
  expires_at:'2026-10-10T02:00:00Z'};
 const key=publicKey.export({format:'pem',type:'spki'});
 const sig=sign(null,Buffer.from(canonicalAttestation(att)),privateKey).toString('base64');
 const args={attestation:att,signature:sig,publicKeyPem:key,sourceSha:sha,
  artifactSha:artifact,now:'2026-10-10T01:00:00Z'};
 assert.equal(evaluateSignedReadiness(args).ready,true);
 assert.equal(evaluateSignedReadiness(args).deploymentAuthorized,false);
 assert.equal(evaluateSignedReadiness({...args,sourceSha:'c'.repeat(40)}).ready,false);
 assert.equal(evaluateSignedReadiness({...args,artifactSha:'d'.repeat(64)}).ready,false);
 assert.equal(evaluateSignedReadiness({...args,now:'2026-10-11T00:00:00Z'}).ready,false);
 assert.equal(evaluateSignedReadiness({...args,signature:'fake'}).ready,false);
 const forged={...att,gates:REQUIRED_GATES.slice(0,-1)};
 assert.equal(evaluateSignedReadiness({...args,attestation:forged}).ready,false);
 assert.equal(evaluateSignedReadiness({...args,publicKeyPem:''}).ready,false);
});
