// External ORIGINAL-BYTE restore custody CONTRACT. No remote DB, backup or real restore is performed.
import {createHash,createPublicKey,verify} from 'node:crypto';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/,ID=/^[A-Za-z0-9._-]{3,80}$/,N=/^[a-f0-9]{32}$/;
const digest=x=>createHash('sha256').update(x).digest('hex');
export function canonicalP16Recovery(r){
 if(!r||r.schema!=='control-p16-recovery-v1'
  ||!['prebackup','restored_original_bytes','cleanup_attestation'].includes(r.phase)
  ||!S.test(r.source_sha||'')||!H.test(r.artifact_sha256||'')
  ||!H.test(r.original_archive_sha256||'')||!H.test(r.restored_object_sha256||'')
  ||!H.test(r.prior_stable_sha256||'')||!H.test(r.previous_record_sha256||'')
  ||!N.test(r.nonce||'')||!ID.test(r.operator_id||'')||!ID.test(r.auditor_id||'')
  ||r.operator_id===r.auditor_id||r.disposition!=='UNVERIFIED_OFFLINE_CLAIM'
  ||typeof r.issued_at!=='string'||!Number.isFinite(Date.parse(r.issued_at))
  ||new Date(r.issued_at).toISOString()!==r.issued_at)
  throw Error('Malformed unsigned or self-promoting restore custody claim');
 return JSON.stringify({schema:r.schema,phase:r.phase,source_sha:r.source_sha,
  artifact_sha256:r.artifact_sha256,original_archive_sha256:r.original_archive_sha256,
  restored_object_sha256:r.restored_object_sha256,prior_stable_sha256:r.prior_stable_sha256,
  previous_record_sha256:r.previous_record_sha256,nonce:r.nonce,
  operator_id:r.operator_id,auditor_id:r.auditor_id,disposition:r.disposition,
  issued_at:r.issued_at});
}
function sig(pem,msg,signature){try{const k=createPublicKey(pem);return k.asymmetricKeyType==='ed25519'
 &&typeof signature==='string'&&/^[A-Za-z0-9+/]{86}==$/.test(signature)
 &&verify(null,Buffer.from(msg),k,Buffer.from(signature,'base64'));}catch{return false;}}
export function auditP16RecoveryClaims({records,expectedSourceSha,expectedArtifactSha,
 independentlyPinnedGenesisSha256,independentlyPinnedHeadSha256,
 independentlyPinnedArchiveSha256,independentlyPinnedPriorStableSha256,
 signerKeys,signerKeyPins,revokedSignerIds=[],now}){
 if(!Array.isArray(records)||records.length!==3||!S.test(expectedSourceSha||'')
  ||!H.test(expectedArtifactSha||'')||!H.test(independentlyPinnedGenesisSha256||'')
  ||!H.test(independentlyPinnedHeadSha256||'')||!H.test(independentlyPinnedArchiveSha256||'')
  ||!H.test(independentlyPinnedPriorStableSha256||'')
  ||!signerKeys||!signerKeyPins||!Array.isArray(revokedSignerIds)
  ||!Number.isFinite(Date.parse(now||'')))throw Error('Independent original-byte restore custody anchors required');
 let previous=independentlyPinnedGenesisSha256,at=-Infinity;const nonces=new Set(),bad=new Set(revokedSignerIds);
 for(let i=0;i<3;i++){
  const {record,operator_signature,auditor_signature}=records[i]||{};
  const msg=canonicalP16Recovery(record),clock=Date.parse(record.issued_at);
  if(record.phase!==['prebackup','restored_original_bytes','cleanup_attestation'][i]
   ||record.previous_record_sha256!==previous||record.source_sha!==expectedSourceSha
   ||record.artifact_sha256!==expectedArtifactSha
   ||record.original_archive_sha256!==independentlyPinnedArchiveSha256
   ||record.prior_stable_sha256!==independentlyPinnedPriorStableSha256
   ||record.restored_object_sha256!==independentlyPinnedPriorStableSha256
   ||nonces.has(record.nonce)||clock<=at||clock>Date.parse(now))
   throw Error('Missing, replayed or byte-substituted recovery phase');
  const op=record.operator_id,au=record.auditor_id;
  if(bad.has(op)||bad.has(au)||!Object.hasOwn(signerKeys,op)||!Object.hasOwn(signerKeys,au)
   ||!H.test(signerKeyPins[op]||'')||!H.test(signerKeyPins[au]||'')
   ||signerKeyPins[op]===signerKeyPins[au]
   ||digest(signerKeys[op])!==signerKeyPins[op]||digest(signerKeys[au])!==signerKeyPins[au]
   ||!sig(signerKeys[op],msg,operator_signature)
   ||!sig(signerKeys[au],msg,auditor_signature))
   throw Error('Original-byte recovery independent operator signature rejected');
  nonces.add(record.nonce);at=clock;previous=digest(msg);
 }
 if(previous!==independentlyPinnedHeadSha256)throw Error('Externally pinned recovery chain head diverged');
 return {schema:'control-p16-recovery-audit-v1',claims_verified:3,
  original_archive_sha256:independentlyPinnedArchiveSha256,
  signed_metadata_digest_consistent:true,actual_backup_bytes_independently_examined:false,
  actual_disposable_restore_performed:false,real_human_witness_verified:false,
  production_rollback_authorized:false,release_authorized:false};
}
