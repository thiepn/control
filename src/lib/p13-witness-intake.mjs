// OFFLINE dual-custody review metadata. Never proves any physical action or rights ownership.
import {createHash,createPublicKey,verify} from 'node:crypto';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/,N=/^[a-f0-9]{32}$/,ID=/^[a-zA-Z0-9._-]{3,80}$/;
const stamp=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const TYPES=new Set(['android_device','ios_device','screen_reader','privacy_review','source_rights','object_custody','offline_recovery','disposable_restore']);
export const p13Sha256=s=>createHash('sha256').update(s).digest('hex');
function time(s){if(typeof s!=='string'||!stamp.test(s)||!Number.isFinite(Date.parse(s))
 ||new Date(s).toISOString()!==s)throw Error('Noncanonical witness timestamp');return Date.parse(s);}
function signature(pem,msg,sig){
 try{const k=createPublicKey(pem);return k.asymmetricKeyType==='ed25519'
  &&typeof sig==='string'&&/^[a-zA-Z0-9+/]{86}==$/.test(sig)
  &&verify(null,Buffer.from(msg),k,Buffer.from(sig,'base64'));}catch{return false;}
}
export function canonicalP13Witness(v){
 if(!v||v.schema!=='control-p13-witness-intake-v1'||!TYPES.has(v.kind)
  ||!S.test(v.source_sha||'')||!H.test(v.artifact_sha256||'')
  ||!H.test(v.evidence_sha256||'')||!H.test(v.object_sha256||'')
  ||!H.test(v.rights_sha256||'')||!H.test(v.previous_sha256||'')
  ||!N.test(v.nonce||'')||!ID.test(v.observer_id||'')
  ||!ID.test(v.auditor_id||'')||!ID.test(v.observer_org||'')
  ||!ID.test(v.auditor_org||'')||v.observer_id===v.auditor_id
  ||v.observer_org===v.auditor_org
  ||v.classification!=='metadata_only_unverified')throw Error('Malformed separated custody witness');
 time(v.issued_at);
 return JSON.stringify({schema:v.schema,kind:v.kind,source_sha:v.source_sha,
  artifact_sha256:v.artifact_sha256,evidence_sha256:v.evidence_sha256,
  object_sha256:v.object_sha256,rights_sha256:v.rights_sha256,
  previous_sha256:v.previous_sha256,nonce:v.nonce,
  observer_id:v.observer_id,auditor_id:v.auditor_id,
  observer_org:v.observer_org,auditor_org:v.auditor_org,
  classification:v.classification,issued_at:v.issued_at});
}
export function auditP13WitnessIntake({entries,pinnedGenesisSha256,pinnedHeadSha256,
 expectedSourceSha,expectedArtifactSha,reviewerKeys,reviewerKeyPins,now}){
 if(!Array.isArray(entries)||entries.length<1||entries.length>100
  ||!H.test(pinnedGenesisSha256||'')||!H.test(pinnedHeadSha256||'')
  ||!S.test(expectedSourceSha||'')||!H.test(expectedArtifactSha||'')
  ||!reviewerKeys||!reviewerKeyPins)throw Error('Independent witness pins required');
 const nowMs=time(now);let previous=pinnedGenesisSha256,last=-Infinity;
 const usedNonces=new Set(),seen=new Set();
 for(const entry of entries){
  const {record,observer_signature,auditor_signature}=entry||{};
  const msg=canonicalP13Witness(record),observed=time(record.issued_at);
  if(record.source_sha!==expectedSourceSha||record.artifact_sha256!==expectedArtifactSha
   ||record.previous_sha256!==previous||observed<=last||observed>nowMs
   ||usedNonces.has(record.nonce))throw Error('Fork, replay, future or swapped evidence');
  const a=record.observer_id,b=record.auditor_id;
  if(!Object.hasOwn(reviewerKeys,a)||!Object.hasOwn(reviewerKeys,b)
   ||!H.test(reviewerKeyPins[a]||'')||!H.test(reviewerKeyPins[b]||'')
   ||reviewerKeyPins[a]===reviewerKeyPins[b]
   ||p13Sha256(reviewerKeys[a])!==reviewerKeyPins[a]
   ||p13Sha256(reviewerKeys[b])!==reviewerKeyPins[b]
   ||!signature(reviewerKeys[a],msg,observer_signature)
   ||!signature(reviewerKeys[b],msg,auditor_signature))
   throw Error('Missing two independently anchored valid reviewer endorsements');
  usedNonces.add(record.nonce);seen.add(record.kind);
  previous=p13Sha256(msg);last=observed;
 }
 if(previous!==pinnedHeadSha256)throw Error('Truncated or replaced externally pinned witness head');
 return {schema:'control-p13-witness-audit-v1',records_verified:entries.length,
  categories_seen:[...seen],head_sha256:previous,cryptographic_metadata_verified:true,
  physical_device_verified:false,rights_ownership_verified:false,
  real_supabase_restore_verified:false,human_approval_verified:false,
  release_authorized:false};
}
