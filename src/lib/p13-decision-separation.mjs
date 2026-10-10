// Role-segregated nonrelease acknowledgment. This file exports NO approval or deploy path.
import {createHash,createPublicKey,verify} from 'node:crypto';
const S=/^[a-f0-9]{40}$/,H=/^[a-f0-9]{64}$/,N=/^[a-f0-9]{32}$/,ID=/^[a-zA-Z0-9._-]{3,80}$/;
const sha=x=>createHash('sha256').update(x).digest('hex');
export function canonicalP13Decision(v){
 if(!v||v.schema!=='control-p13-owner-review-v1'
  ||!S.test(v.source_sha||'')||!H.test(v.artifact_sha256||'')
  ||!H.test(v.witness_head_sha256||'')||!H.test(v.trust_head_sha256||'')
  ||!N.test(v.nonce||'')||!ID.test(v.owner_id||'')||!ID.test(v.auditor_id||'')
  ||v.owner_id===v.auditor_id
  ||v.action!=='REVIEW_ONLY_DENY'
  ||typeof v.issued_at!=='string'||!Number.isFinite(Date.parse(v.issued_at))
  ||new Date(v.issued_at).toISOString()!==v.issued_at)
  throw Error('Only nonrelease dual-operator review acknowledgments permitted');
 return JSON.stringify({schema:v.schema,source_sha:v.source_sha,
  artifact_sha256:v.artifact_sha256,witness_head_sha256:v.witness_head_sha256,
  trust_head_sha256:v.trust_head_sha256,nonce:v.nonce,owner_id:v.owner_id,
  auditor_id:v.auditor_id,action:v.action,issued_at:v.issued_at});
}
function validateSig(pem,msg,sig){try{const k=createPublicKey(pem);
 return k.asymmetricKeyType==='ed25519'&&typeof sig==='string'
  &&/^[a-zA-Z0-9+/]{86}==$/.test(sig)
  &&verify(null,Buffer.from(msg),k,Buffer.from(sig,'base64'));}catch{return false;}}
export function reviewP13OperatorAcknowledgment({record,owner_signature,auditor_signature,
 ownerPublicKeyPem,auditorPublicKeyPem,pinnedOwnerKeySha256,pinnedAuditorKeySha256,
 expectedSourceSha,expectedArtifactSha,pinnedWitnessHeadSha256,pinnedTrustHeadSha256,now}){
 const msg=canonicalP13Decision(record);
 if(record.source_sha!==expectedSourceSha||record.artifact_sha256!==expectedArtifactSha
  ||record.witness_head_sha256!==pinnedWitnessHeadSha256
  ||record.trust_head_sha256!==pinnedTrustHeadSha256
  ||!H.test(pinnedOwnerKeySha256||'')||!H.test(pinnedAuditorKeySha256||'')
  ||pinnedOwnerKeySha256===pinnedAuditorKeySha256
  ||sha(ownerPublicKeyPem)!==pinnedOwnerKeySha256||sha(auditorPublicKeyPem)!==pinnedAuditorKeySha256
  ||!Number.isFinite(Date.parse(now||''))||Date.parse(record.issued_at)>Date.parse(now)
  ||Date.parse(now)-Date.parse(record.issued_at)>15*60*1000
  ||!validateSig(ownerPublicKeyPem,msg,owner_signature)
  ||!validateSig(auditorPublicKeyPem,msg,auditor_signature))
  throw Error('Independent dual operator review not proven');
 return {schema:'control-p13-dual-review-v1',acknowledgment_sha256:sha(msg),
  signatures_verified:2,decision:'DENY',human_action_verified:false,
  release_authorized:false,merge_authorized:false,
  migration_authorized:false,deployment_authorized:false,
  note:'Signatures attest nonrelease review metadata only, not human approval'};
}
