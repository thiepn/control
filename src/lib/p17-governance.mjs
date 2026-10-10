// Externally governed ORIGINAL-EVIDENCE HASH intake; cryptographic claim != actual person, rights or device approval.
import {createHash,createPublicKey,verify} from 'node:crypto';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/,N=/^[a-f0-9]{32}$/,ID=/^[A-Za-z0-9._-]{3,80}$/;
const KINDS=['consent_rights','android_chrome','ios_safari','nvda','voiceover','privacy_review'];
export const p17sha=s=>createHash('sha256').update(s).digest('hex');
function timestamp(s){
 if(typeof s!=='string'||!Number.isFinite(Date.parse(s))||new Date(s).toISOString()!==s)
  throw Error('Noncanonical custody clock');
 return Date.parse(s);
}
function validSignature(pem,msg,signature){
 try{const key=createPublicKey(pem);return key.asymmetricKeyType==='ed25519'
   &&typeof signature==='string'&&/^[A-Za-z0-9+/]{86}==$/.test(signature)
   &&verify(null,Buffer.from(msg),key,Buffer.from(signature,'base64'));}catch{return false;}
}
export function canonicalP17Original(v){
 if(!v||v.schema!=='control-p17-original-witness-v1'||!KINDS.includes(v.kind)
  ||!S.test(v.source_sha||'')||!H.test(v.artifact_sha256||'')
  ||!H.test(v.frozen_candidate_sha256||'')||!H.test(v.original_bytes_sha256||'')
  ||!H.test(v.object_sha256||'')||!H.test(v.rights_sha256||'')
  ||!H.test(v.previous_sha256||'')||!N.test(v.nonce||'')
  ||!ID.test(v.observer_id||'')||!ID.test(v.adjudicator_id||'')
  ||!ID.test(v.observer_org||'')||!ID.test(v.adjudicator_org||'')
  ||v.observer_id===v.adjudicator_id||v.observer_org===v.adjudicator_org
  ||v.classification!=='UNVERIFIED_ORIGINAL_EVIDENCE_CLAIM')
  throw Error('External original witness claim malformed or self approved');
 timestamp(v.issued_at);
 return JSON.stringify({schema:v.schema,kind:v.kind,source_sha:v.source_sha,
  artifact_sha256:v.artifact_sha256,frozen_candidate_sha256:v.frozen_candidate_sha256,
  original_bytes_sha256:v.original_bytes_sha256,object_sha256:v.object_sha256,
  rights_sha256:v.rights_sha256,previous_sha256:v.previous_sha256,
  nonce:v.nonce,observer_id:v.observer_id,adjudicator_id:v.adjudicator_id,
  observer_org:v.observer_org,adjudicator_org:v.adjudicator_org,
  classification:v.classification,issued_at:v.issued_at});
}
export function auditP17OriginalWitnesses({records,expectedSourceSha,expectedArtifactSha,
 pinnedCandidateSha256,pinnedGenesisSha256,pinnedHeadSha256,signerKeys,signerKeyPins,
 revokedSignerIds=[],now}){
 if(!Array.isArray(records)||records.length!==6||!S.test(expectedSourceSha||'')
  ||!H.test(expectedArtifactSha||'')||!H.test(pinnedCandidateSha256||'')
  ||!H.test(pinnedGenesisSha256||'')||!H.test(pinnedHeadSha256||'')
  ||!signerKeys||!signerKeyPins||!Array.isArray(revokedSignerIds))
  throw Error('Six separately scoped original evidence claims and external pins required');
 let prev=pinnedGenesisSha256,lastAt=-Infinity;const nowMs=timestamp(now);
 const used=new Set(),kinds=new Set(),bad=new Set(revokedSignerIds),originals=new Set();
 for(const e of records){
  const {record,observer_signature,adjudicator_signature}=e||{},msg=canonicalP17Original(record);
  const at=timestamp(record.issued_at);
  if(record.source_sha!==expectedSourceSha||record.artifact_sha256!==expectedArtifactSha
   ||record.frozen_candidate_sha256!==pinnedCandidateSha256
   ||record.previous_sha256!==prev||at<=lastAt||at>nowMs
   ||used.has(record.nonce)||kinds.has(record.kind)||originals.has(record.original_bytes_sha256))
   throw Error('Original-byte duplicate, fork, replay, clock or source substitution');
  const a=record.observer_id,b=record.adjudicator_id;
  if(bad.has(a)||bad.has(b)||!Object.hasOwn(signerKeys,a)||!Object.hasOwn(signerKeys,b)
   ||!H.test(signerKeyPins[a]||'')||!H.test(signerKeyPins[b]||'')
   ||signerKeyPins[a]===signerKeyPins[b]
   ||p17sha(signerKeys[a])!==signerKeyPins[a]||p17sha(signerKeys[b])!==signerKeyPins[b]
   ||!validSignature(signerKeys[a],msg,observer_signature)
   ||!validSignature(signerKeys[b],msg,adjudicator_signature))
   throw Error('Invalid, compromised or nonindependent original-custody signatures');
  used.add(record.nonce);kinds.add(record.kind);originals.add(record.original_bytes_sha256);
  prev=p17sha(msg);lastAt=at;
 }
 if(KINDS.some(x=>!kinds.has(x))||prev!==pinnedHeadSha256)
  throw Error('Original evidence scopes or latest independently pinned head missing');
 return {schema:'control-p17-original-witness-audit-v1',claims_verified:records.length,
  scope_names:KINDS,head_sha256:prev,original_byte_claims_distinct:originals.size,
  cryptographic_claims_valid:true,actual_human_consent_verified:false,
  original_byte_files_independently_examined:false,physical_tests_performed:false,
  rights_owner_approved:false,accessibility_approved:false,release_authorized:false};
}
