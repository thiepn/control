// Independent pre-cutover freeze and postrelease rollback DENIAL ONLY; cannot grant release authority.
import {createHash,createPublicKey,verify} from 'node:crypto';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/,N=/^[a-f0-9]{32}$/,ID=/^[A-Za-z0-9._-]{3,80}$/;
const digest=x=>createHash('sha256').update(x).digest('hex');
export function canonicalP15Freeze(v){
 if(!v||v.schema!=='control-p15-freeze-v1'
  ||!['precutover_freeze','postrelease_rollback_hold'].includes(v.stage)
  ||v.action!=='DENY'
  ||!S.test(v.source_sha||'')||!H.test(v.artifact_sha256||'')
  ||!H.test(v.consent_head_sha256||'')||!H.test(v.image_sha256||'')
  ||!H.test(v.previous_sha256||'')||!N.test(v.nonce||'')
  ||!ID.test(v.owner_id||'')||!ID.test(v.independent_reviewer_id||'')
  ||v.owner_id===v.independent_reviewer_id
  ||typeof v.issued_at!=='string'||!Number.isFinite(Date.parse(v.issued_at))
  ||new Date(v.issued_at).toISOString()!==v.issued_at)
  throw Error('Only source-bound release freeze/rollback HOLD decisions accepted');
 return JSON.stringify({schema:v.schema,stage:v.stage,action:v.action,source_sha:v.source_sha,
  artifact_sha256:v.artifact_sha256,consent_head_sha256:v.consent_head_sha256,
  image_sha256:v.image_sha256,previous_sha256:v.previous_sha256,nonce:v.nonce,
  owner_id:v.owner_id,independent_reviewer_id:v.independent_reviewer_id,
  issued_at:v.issued_at});
}
function signature(pem,msg,sig){try{const key=createPublicKey(pem);
 return key.asymmetricKeyType==='ed25519'&&typeof sig==='string'
  &&/^[A-Za-z0-9+/]{86}==$/.test(sig)
  &&verify(null,Buffer.from(msg),key,Buffer.from(sig,'base64'));}catch{return false;}}
export function auditP15Freeze({entries,expectedSourceSha,expectedArtifactSha,
 independentlyPinnedConsentHead,independentlyPinnedImageSha256,
 independentlyPinnedGenesisSha256,independentlyPinnedFinalSha256,
 signerKeys,signerKeyPins,revokedSignerIds=[],now}){
 if(!Array.isArray(entries)||entries.length!==2||!S.test(expectedSourceSha||'')
  ||!H.test(expectedArtifactSha||'')||!H.test(independentlyPinnedConsentHead||'')
  ||!H.test(independentlyPinnedImageSha256||'')
  ||!H.test(independentlyPinnedGenesisSha256||'')||!H.test(independentlyPinnedFinalSha256||'')
  ||!signerKeys||!signerKeyPins||!Array.isArray(revokedSignerIds)
  ||!Number.isFinite(Date.parse(now||'')))throw Error('Independent operator freeze pins required');
 const compromised=new Set(revokedSignerIds);let last=independentlyPinnedGenesisSha256,previousAt=-Infinity;
 const usedNonces=new Set();
 for(let i=0;i<2;i++){
  const {record,owner_signature,reviewer_signature}=entries[i]||{};
  const msg=canonicalP15Freeze(record),at=Date.parse(record.issued_at);
  if(record.stage!==['precutover_freeze','postrelease_rollback_hold'][i]
   ||record.previous_sha256!==last||record.source_sha!==expectedSourceSha
   ||record.artifact_sha256!==expectedArtifactSha
   ||record.consent_head_sha256!==independentlyPinnedConsentHead
   ||record.image_sha256!==independentlyPinnedImageSha256
   ||usedNonces.has(record.nonce)||at<=previousAt||at>Date.parse(now))
   throw Error('Freeze stage source, order, hash, consent or image mismatch');
  const a=record.owner_id,b=record.independent_reviewer_id;
  if(compromised.has(a)||compromised.has(b)
   ||!Object.hasOwn(signerKeys,a)||!Object.hasOwn(signerKeys,b)
   ||!H.test(signerKeyPins[a]||'')||!H.test(signerKeyPins[b]||'')
   ||signerKeyPins[a]===signerKeyPins[b]
   ||digest(signerKeys[a])!==signerKeyPins[a]
   ||digest(signerKeys[b])!==signerKeyPins[b]
   ||!signature(signerKeys[a],msg,owner_signature)
   ||!signature(signerKeys[b],msg,reviewer_signature))
   throw Error('Separate owner/reviewer freeze trust invalid');
  usedNonces.add(record.nonce);last=digest(msg);previousAt=at;
 }
 if(last!==independentlyPinnedFinalSha256)throw Error('Externally pinned freeze head mismatch');
 return {schema:'control-p15-freeze-audit-v1',stage_records_verified:2,
  freeze_state:'HOLD',release_authorized:false,rollback_authorized:false,
  migration_authorized:false,merge_authorized:false,
  postrelease_accepted:false,actual_human_owner_verified:false};
}
