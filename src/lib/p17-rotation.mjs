// Outside-root witnessed compromise/rotation changes never implicitly trust replacement keys.
import {createHash,createPublicKey,verify} from 'node:crypto';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/,N=/^[a-f0-9]{32}$/,ID=/^[A-Za-z0-9._-]{3,80}$/;
const sha=s=>createHash('sha256').update(s).digest('hex');
export function canonicalP17Rotation(r){
 if(!r||r.schema!=='control-p17-custodian-rotation-v1'
  ||!['compromise','revoke','candidate_replacement'].includes(r.kind)
  ||!S.test(r.source_sha||'')||!H.test(r.artifact_sha256||'')
  ||!H.test(r.previous_sha256||'')||!H.test(r.external_evidence_sha256||'')
  ||!N.test(r.nonce||'')||!ID.test(r.subject_id||'')
  ||(r.replacement_id!==null&&!ID.test(r.replacement_id||''))
  ||(r.kind==='candidate_replacement'&&(!r.replacement_id||r.replacement_id===r.subject_id))
  ||(r.kind!=='candidate_replacement'&&r.replacement_id!==null)
  ||r.disposition!=='REISSUE_AND_EXTERNAL_VERIFICATION_REQUIRED'
  ||typeof r.issued_at!=='string'||!Number.isFinite(Date.parse(r.issued_at))
  ||new Date(r.issued_at).toISOString()!==r.issued_at)
  throw Error('Rotation/revocation must remain externally reissued and unapproved');
 return JSON.stringify({schema:r.schema,kind:r.kind,source_sha:r.source_sha,
  artifact_sha256:r.artifact_sha256,previous_sha256:r.previous_sha256,
  external_evidence_sha256:r.external_evidence_sha256,
  nonce:r.nonce,subject_id:r.subject_id,replacement_id:r.replacement_id,
  disposition:r.disposition,issued_at:r.issued_at});
}
export function auditP17Rotations({events,rootPublicKeyPem,pinnedRootSha256,
 pinnedGenesisSha256,pinnedHeadSha256,expectedSourceSha,expectedArtifactSha,now}){
 if(!Array.isArray(events)||events.length<1||events.length>64
  ||!S.test(expectedSourceSha||'')||!H.test(expectedArtifactSha||'')
  ||!H.test(pinnedRootSha256||'')||!H.test(pinnedGenesisSha256||'')
  ||!H.test(pinnedHeadSha256||'')||sha(rootPublicKeyPem)!==pinnedRootSha256)
  throw Error('Independently pinned external revocation root/genesis/head mandatory');
 let root;try{root=createPublicKey(rootPublicKeyPem);}catch{throw Error('Bad external root');}
 if(root.asymmetricKeyType!=='ed25519')throw Error('Ed25519 root required');
 let prev=pinnedGenesisSha256,clock=-Infinity,nowMs=Date.parse(now);
 if(!Number.isFinite(nowMs))throw Error('Independent audit time invalid');
 const nonces=new Set(),dead=new Set(),pending=new Set();
 for(const e of events){
  const {record,root_signature}=e||{},msg=canonicalP17Rotation(record),at=Date.parse(record.issued_at);
  if(record.previous_sha256!==prev||record.source_sha!==expectedSourceSha
   ||record.artifact_sha256!==expectedArtifactSha||at<=clock||at>nowMs
   ||nonces.has(record.nonce)||typeof root_signature!=='string'
   ||!/^[A-Za-z0-9+/]{86}==$/.test(root_signature)
   ||!verify(null,Buffer.from(msg),root,Buffer.from(root_signature,'base64')))
   throw Error('Revocation chronology fork, future event or untrusted signature');
  if(record.kind==='candidate_replacement'){
   if(!dead.has(record.subject_id)||dead.has(record.replacement_id)||pending.has(record.replacement_id))
    throw Error('Replacement candidate not explicitly associated with a revoked predecessor');
   pending.add(record.replacement_id);
  }else{
   if(dead.has(record.subject_id))throw Error('Duplicate compromised/revoked key');
   dead.add(record.subject_id);pending.delete(record.subject_id);
  }
  nonces.add(record.nonce);prev=sha(msg);clock=at;
 }
 if(prev!==pinnedHeadSha256)throw Error('Truncated/altered independently pinned replacement head');
 return {schema:'control-p17-rotation-audit-v1',events_verified:events.length,
  untrusted_key_ids:[...dead,...pending],replacement_candidates_pending:[...pending],
  externally_reissued_keys_verified:false,genuine_operators_verified:false,
  evidence_reissue_required:dead.size>0||pending.size>0,
  release_authorized:false};
}
