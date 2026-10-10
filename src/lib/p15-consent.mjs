// P15: OFF-GIT consent/rights revocation chronology. Authenticates claims, not actual consent.
import {createHash,createPublicKey,verify} from 'node:crypto';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/,N=/^[a-f0-9]{32}$/,ID=/^[A-Za-z0-9._-]{3,80}$/;
const T=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const digest=x=>createHash('sha256').update(x).digest('hex');
function time(t){if(typeof t!=='string'||!T.test(t)||!Number.isFinite(Date.parse(t))
 ||new Date(t).toISOString()!==t)throw Error('Noncanonical consent timestamp');return Date.parse(t);}
function checkSig(pem,msg,signature){try{const k=createPublicKey(pem);
 return k.asymmetricKeyType==='ed25519'&&typeof signature==='string'
  &&/^[A-Za-z0-9+/]{86}==$/.test(signature)
  &&verify(null,Buffer.from(msg),k,Buffer.from(signature,'base64'));}catch{return false;}}
export function canonicalP15Consent(r){
 if(!r||r.schema!=='control-p15-consent-v1'
  ||!['grant_claim','revoke_claim'].includes(r.action)
  ||!S.test(r.source_sha||'')||!H.test(r.artifact_sha256||'')
  ||!H.test(r.object_sha256||'')||!H.test(r.rights_sha256||'')
  ||!H.test(r.evidence_sha256||'')||!H.test(r.previous_sha256||'')
  ||!N.test(r.nonce||'')||!ID.test(r.subject_id||'')
  ||!ID.test(r.custodian_id||'')||!ID.test(r.independent_auditor_id||'')
  ||r.custodian_id===r.independent_auditor_id
  ||r.classification!=='UNVERIFIED_EXTERNAL_METADATA')
  throw Error('Malformed review-only consent/revocation record');
 time(r.issued_at);
 return JSON.stringify({schema:r.schema,action:r.action,source_sha:r.source_sha,
  artifact_sha256:r.artifact_sha256,object_sha256:r.object_sha256,
  rights_sha256:r.rights_sha256,evidence_sha256:r.evidence_sha256,
  previous_sha256:r.previous_sha256,nonce:r.nonce,subject_id:r.subject_id,
  custodian_id:r.custodian_id,independent_auditor_id:r.independent_auditor_id,
  classification:r.classification,issued_at:r.issued_at});
}
export function auditP15ConsentHistory({entries,expectedSourceSha,expectedArtifactSha,
 pinnedGenesisSha256,pinnedHeadSha256,signerKeys,signerKeyPins,now,compromisedSignerIds=[]}){
 if(!Array.isArray(entries)||entries.length<1||entries.length>100
  ||!S.test(expectedSourceSha||'')||!H.test(expectedArtifactSha||'')
  ||!H.test(pinnedGenesisSha256||'')||!H.test(pinnedHeadSha256||'')
  ||!signerKeys||!signerKeyPins||!Array.isArray(compromisedSignerIds))
  throw Error('Independent consent chronology and signer pins mandatory');
 const compromised=new Set(compromisedSignerIds);let last=pinnedGenesisSha256,lastAt=-Infinity;
 const nonces=new Set(),claimed=new Set(),revoked=new Set();
 for(const e of entries){
  const {record,custodian_signature,auditor_signature}=e||{},msg=canonicalP15Consent(record);
  const at=time(record.issued_at);
  if(record.previous_sha256!==last||record.source_sha!==expectedSourceSha
   ||record.artifact_sha256!==expectedArtifactSha||at<=lastAt||at>time(now)
   ||nonces.has(record.nonce))throw Error('Consent/revocation replay, fork, time or source mismatch');
  const a=record.custodian_id,b=record.independent_auditor_id;
  if(compromised.has(a)||compromised.has(b)
   ||!Object.hasOwn(signerKeys,a)||!Object.hasOwn(signerKeys,b)
   ||!H.test(signerKeyPins[a]||'')||!H.test(signerKeyPins[b]||'')
   ||signerKeyPins[a]===signerKeyPins[b]
   ||digest(signerKeys[a])!==signerKeyPins[a]||digest(signerKeys[b])!==signerKeyPins[b]
   ||!checkSig(signerKeys[a],msg,custodian_signature)
   ||!checkSig(signerKeys[b],msg,auditor_signature))
   throw Error('Compromised or untrusted external consent custodians');
  const item=record.subject_id+':'+record.object_sha256;
  if(record.action==='grant_claim'){
   if(claimed.has(item)||revoked.has(item))throw Error('Repeated or resurrected consent claim');
   claimed.add(item);
  }else{
   if(!claimed.has(item)||revoked.has(item))throw Error('Revocation without prior unique claim');
   revoked.add(item);
  }
  last=digest(msg);lastAt=at;nonces.add(record.nonce);
 }
 if(last!==pinnedHeadSha256)throw Error('Externally pinned final consent history changed');
 return {schema:'control-p15-consent-audit-v1',records_verified:entries.length,
  revoked_claims:revoked.size,unrevoked_claims:[...claimed].filter(x=>!revoked.has(x)).length,
  claimed_human_consent_verified:false,rights_ownership_verified:false,
  human_approval_verified:false,release_authorized:false,
  note:'Signed off-Git claims only; does not grant consent or authenticate a natural person'};
}
