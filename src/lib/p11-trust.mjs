// Independently pinned OFFLINE trust epochs; no key generation, signing, release, or network access.
import {createPublicKey,verify,createHash} from 'node:crypto';
const HASH=/^[0-9a-f]{64}$/,KEY=/^[a-zA-Z0-9._-]{3,80}$/,STAMP=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const digest=s=>createHash('sha256').update(s).digest('hex');
function instant(s){if(typeof s!=='string'||!STAMP.test(s)||!Number.isFinite(Date.parse(s))
 ||new Date(s).toISOString()!==s)throw Error('Noncanonical trusted timestamp');return Date.parse(s);}
function edKey(pem){const k=createPublicKey(pem);if(k.asymmetricKeyType!=='ed25519')throw Error('Ed25519 key required');return k;}
export function canonicalTrustEvent(e){
 if(!e||e.schema!=='control-p11-trust-event-v1'||!Number.isSafeInteger(e.sequence)||e.sequence<0
 ||!HASH.test(e.previous_sha256||'')||!KEY.test(e.key_id||'')
 ||typeof e.public_key_pem!=='string'||!Array.isArray(e.revoked_key_ids)
 ||e.revoked_key_ids.some(k=>!KEY.test(k))||new Set(e.revoked_key_ids).size!==e.revoked_key_ids.length)
  throw Error('Malformed trust rotation event');
 instant(e.effective_at);edKey(e.public_key_pem);
 return JSON.stringify({schema:e.schema,sequence:e.sequence,previous_sha256:e.previous_sha256,
  key_id:e.key_id,public_key_pem:e.public_key_pem,effective_at:e.effective_at,
  revoked_key_ids:e.revoked_key_ids});
}
function verifySig(pem,message,signature){
 if(typeof signature!=='string'||!/^[A-Za-z0-9+/]{86}==$/.test(signature)
  ||!verify(null,Buffer.from(message),edKey(pem),Buffer.from(signature,'base64')))
  throw Error('Externally pinned trust signature invalid');
}
export function auditTrustEpochs({events,rootPublicKeyPem,pinnedRootSha256,pinnedGenesisSha256,
 pinnedHeadSha256,now}){
 if(!Array.isArray(events)||!events.length||!HASH.test(pinnedRootSha256||'')
 ||!HASH.test(pinnedGenesisSha256||'')||!HASH.test(pinnedHeadSha256||''))
  throw Error('External root, genesis and latest-head pins are mandatory');
 const nowMs=instant(now);
 if(digest(rootPublicKeyPem)!==pinnedRootSha256)throw Error('Independent root fingerprint mismatch');
 edKey(rootPublicKeyPem);
 let last=pinnedGenesisSha256,previousTime=-Infinity,priorKey=null;
 const active=new Map(),revoked=new Set(),seen=new Set();
 for(let i=0;i<events.length;i++){
  const {record,root_signature,prior_signature}=events[i]||{};
  const msg=canonicalTrustEvent(record),at=instant(record.effective_at);
  if(record.sequence!==i||record.previous_sha256!==last||at<=previousTime||at>nowMs
   ||seen.has(record.key_id)||revoked.has(record.key_id))
   throw Error('Replayed, reordered, future or forked trust event');
  verifySig(rootPublicKeyPem,msg,root_signature);
  if(i){if(!priorKey||!active.has(priorKey))throw Error('Previous custodian is revoked');
   verifySig(active.get(priorKey),msg,prior_signature);}
  else if(prior_signature!==null)throw Error('Genesis must have no predecessor signature');
  for(const key of record.revoked_key_ids){
   if(!active.has(key)||revoked.has(key))throw Error('Unknown or repeatedly revoked key');
   active.delete(key);revoked.add(key);
  }
  active.set(record.key_id,record.public_key_pem);seen.add(record.key_id);
  priorKey=record.key_id;previousTime=at;last=digest(msg);
 }
 if(last!==pinnedHeadSha256)throw Error('Independent latest trust head pin mismatch');
 return {schema:'control-p11-trust-audit-v1',head_sha256:last,
  activeKeys:Object.fromEntries(active),revokedKeyIds:[...revoked],
  events_verified:events.length,releaseAuthorized:false,deploymentAuthorized:false};
}
