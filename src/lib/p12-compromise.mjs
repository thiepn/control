// Independent root-pinned security incident chronology. Signatures authenticate metadata, NOT human approvals.
import {createHash,createPublicKey,verify} from 'node:crypto';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/,K=/^[a-zA-Z0-9._-]{3,80}$/,T=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const digest=v=>createHash('sha256').update(v).digest('hex');
function instant(v){
 if(typeof v!=='string'||!T.test(v)||!Number.isFinite(Date.parse(v))
  ||new Date(v).toISOString()!==v)throw Error('Invalid canonical incident time');
 return Date.parse(v);
}
function key(v){
 const parsed=createPublicKey(v);
 if(parsed.asymmetricKeyType!=='ed25519')throw Error('Trusted Ed25519 key required');
 return parsed;
}
export function canonicalIncident(v){
 if(!v||v.schema!=='control-p12-incident-v1'
  ||!Number.isSafeInteger(v.sequence)||v.sequence<0
  ||!['rotation','compromise','revocation','recovery'].includes(v.kind)
  ||!H.test(v.previous_sha256||'')||!H.test(v.nonce||'')
  ||!H.test(v.evidence_sha256||'')||!H.test(v.artifact_sha256||'')
  ||!S.test(v.source_sha||'')||!K.test(v.subject_key_id||'')
  ||!(v.replacement_key_id===null||K.test(v.replacement_key_id||'')))
  throw Error('Malformed security incident');
 instant(v.effective_at);
 if(v.kind==='rotation'||v.kind==='recovery'){
  if(!v.replacement_key_id||v.replacement_key_id===v.subject_key_id)
   throw Error('Rotation/recovery must identify distinct new custodian');
 }else if(v.replacement_key_id!==null)throw Error('Revocation/compromise cannot activate replacement');
 return JSON.stringify({schema:v.schema,sequence:v.sequence,kind:v.kind,
  previous_sha256:v.previous_sha256,nonce:v.nonce,evidence_sha256:v.evidence_sha256,
  source_sha:v.source_sha,artifact_sha256:v.artifact_sha256,
  subject_key_id:v.subject_key_id,replacement_key_id:v.replacement_key_id,
  effective_at:v.effective_at});
}
function verifySignature(pem,message,signature){
 if(typeof signature!=='string'||!/^[A-Za-z0-9+/]{86}==$/.test(signature)
  ||!verify(null,Buffer.from(message),key(pem),Buffer.from(signature,'base64')))
  throw Error('External incident root signature invalid');
}
export function auditCompromiseChronology({events,rootPublicKeyPem,pinnedRootSha256,
 pinnedGenesisSha256,pinnedHeadSha256,expectedSourceSha,expectedArtifactSha,now}){
 if(!Array.isArray(events)||!events.length||events.length>1000
  ||!H.test(pinnedGenesisSha256||'')||!H.test(pinnedHeadSha256||'')
  ||!H.test(pinnedRootSha256||'')||!S.test(expectedSourceSha||'')
  ||!H.test(expectedArtifactSha||'')||digest(rootPublicKeyPem)!==pinnedRootSha256)
  throw Error('Independent root, timeline and source pins required');
 key(rootPublicKeyPem);
 let previous=pinnedGenesisSha256,lastTime=-Infinity,previousNonce=new Set();
 const compromised=new Set(),revoked=new Set(),seen=new Set();
 const until=instant(now);
 for(let i=0;i<events.length;i++){
  const {record,root_signature}=events[i]||{};
  const msg=canonicalIncident(record),at=instant(record.effective_at);
  if(record.sequence!==i||record.previous_sha256!==previous||at<=lastTime||at>until
   ||record.source_sha!==expectedSourceSha||record.artifact_sha256!==expectedArtifactSha
   ||previousNonce.has(record.nonce))
   throw Error('Replayed, stale, forked or substituted incident chronology');
  verifySignature(rootPublicKeyPem,msg,root_signature);
  if(record.kind==='compromise') compromised.add(record.subject_key_id);
  if(record.kind==='revocation')revoked.add(record.subject_key_id);
  if((record.kind==='rotation'||record.kind==='recovery') &&
   (compromised.has(record.replacement_key_id)||revoked.has(record.replacement_key_id)
    ||seen.has(record.replacement_key_id)))
   throw Error('Previously compromised, revoked or replayed replacement identity');
  if(record.kind==='rotation'||record.kind==='recovery')seen.add(record.replacement_key_id);
  previousNonce.add(record.nonce);previous=digest(msg);lastTime=at;
 }
 if(previous!==pinnedHeadSha256)throw Error('Latest externally pinned incident head differs');
 return {schema:'control-p12-compromise-audit-v1',head_sha256:previous,
  events_verified:events.length,compromised_key_ids:[...compromised],
  revoked_key_ids:[...revoked],release_authorized:false,
  human_approval_verified:false,external_witness_collected:false};
}
