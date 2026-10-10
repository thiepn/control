import test from 'node:test';import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {canonicalP16Recovery,auditP16RecoveryClaims} from '../src/lib/p16-recovery.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex'),zero='0'.repeat(64);
const A=generateKeyPairSync('ed25519'),B=generateKeyPairSync('ed25519');
const signerKeys={restorer_a:A.publicKey.export({type:'spki',format:'pem'}),
 auditor_b:B.publicKey.export({type:'spki',format:'pem'})};
const signerKeyPins=Object.fromEntries(Object.entries(signerKeys).map(([k,p])=>[k,hash(p)]));
const sha='a'.repeat(40),art='b'.repeat(64),archive='c'.repeat(64),prior='d'.repeat(64);
function fixture(){
 let prev=zero;
 const records=['prebackup','restored_original_bytes','cleanup_attestation'].map((phase,i)=>{
  const record={schema:'control-p16-recovery-v1',phase,source_sha:sha,
   artifact_sha256:art,original_archive_sha256:archive,
   restored_object_sha256:prior,prior_stable_sha256:prior,
   previous_record_sha256:prev,nonce:String(i+1).padStart(32,'0'),
   operator_id:'restorer_a',auditor_id:'auditor_b',disposition:'UNVERIFIED_OFFLINE_CLAIM',
   issued_at:'2026-10-10T11:'+String(i+10).padStart(2,'0')+':00.000Z'};
  const msg=canonicalP16Recovery(record);prev=hash(msg);
  return {record,operator_signature:sign(null,Buffer.from(msg),A.privateKey).toString('base64'),
   auditor_signature:sign(null,Buffer.from(msg),B.privateKey).toString('base64')};
 });
 return {records,expectedSourceSha:sha,expectedArtifactSha:art,
  independentlyPinnedGenesisSha256:zero,independentlyPinnedHeadSha256:prev,
  independentlyPinnedArchiveSha256:archive,independentlyPinnedPriorStableSha256:prior,
  signerKeys,signerKeyPins,now:'2026-10-10T11:20:00.000Z'};
}
test('three-phase synthetic original-byte recovery claims are consistent but never a real restore',()=>{
 const x=auditP16RecoveryClaims(fixture());
 assert.equal(x.claims_verified,3);assert.equal(x.actual_disposable_restore_performed,false);
 assert.equal(x.actual_backup_bytes_independently_examined,false);assert.equal(x.release_authorized,false);
});
test('archive drift, reordered phases, revoked signer, fake recovery, forged witness, stale head fail',()=>{
 const x=fixture();
 for(const v of [
  {...x,records:[x.records[1],x.records[0],x.records[2]]},
  {...x,revokedSignerIds:['restorer_a']},
  {...x,independentlyPinnedArchiveSha256:'f'.repeat(64)},
  {...x,independentlyPinnedHeadSha256:'f'.repeat(64)},
  {...x,records:[x.records[0],{...x.records[1],auditor_signature:'A'.repeat(88)},x.records[2]]},
  {...x,records:[x.records[0],{...x.records[1],record:{...x.records[1].record,
    restored_object_sha256:'f'.repeat(64)}},x.records[2]]},
  {...x,records:[x.records[0],{...x.records[1],record:{...x.records[1].record,
    disposition:'PRODUCTION_APPROVED'}},x.records[2]]},
  {...x,now:'2026-10-10T11:05:00.000Z'}
 ])assert.throws(()=>auditP16RecoveryClaims(v));
});
