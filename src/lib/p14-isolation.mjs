// Separate pre-cutover/postrelease DENY ledgers. No approval, migration or deployment code.
import {createHash,createPublicKey,verify} from 'node:crypto';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/,N=/^[a-f0-9]{32}$/,ID=/^[A-Za-z0-9._-]{3,80}$/;
const sha=s=>createHash('sha256').update(s).digest('hex');
export function canonicalP14Stage(r){
 if(!r||r.schema!=='control-p14-stage-denial-v1'
  ||!['precutover','postrelease'].includes(r.stage)
  ||!S.test(r.source_sha||'')||!H.test(r.artifact_sha256||'')
  ||!H.test(r.witness_head_sha256||'')||!H.test(r.previous_stage_sha256||'')
  ||!N.test(r.nonce||'')||!ID.test(r.operator_id||'')||!ID.test(r.auditor_id||'')
  ||r.operator_id===r.auditor_id||r.action!=='DENY'
  ||typeof r.issued_at!=='string'||!Number.isFinite(Date.parse(r.issued_at))
  ||new Date(r.issued_at).toISOString()!==r.issued_at)
  throw Error('Only stage-specific DENY records allowed');
 return JSON.stringify({schema:r.schema,stage:r.stage,source_sha:r.source_sha,
  artifact_sha256:r.artifact_sha256,witness_head_sha256:r.witness_head_sha256,
  previous_stage_sha256:r.previous_stage_sha256,nonce:r.nonce,
  operator_id:r.operator_id,auditor_id:r.auditor_id,
  action:r.action,issued_at:r.issued_at});
}
function verifySig(pem,msg,sig){
 try{const k=createPublicKey(pem);return k.asymmetricKeyType==='ed25519'
  &&typeof sig==='string'&&/^[A-Za-z0-9+/]{86}==$/.test(sig)
  &&verify(null,Buffer.from(msg),k,Buffer.from(sig,'base64'));}catch{return false;}
}
export function auditP14DecisionStages({entries,expectedSourceSha,expectedArtifactSha,
 independentlyPinnedGenesisSha256,independentlyPinnedHeadSha256,
 independentlyPinnedWitnessHeadSha256,operators,operatorKeyPins,now}){
 if(!Array.isArray(entries)||entries.length!==2||!S.test(expectedSourceSha||'')
  ||!H.test(expectedArtifactSha||'')||!H.test(independentlyPinnedGenesisSha256||'')
  ||!H.test(independentlyPinnedHeadSha256||'')||!H.test(independentlyPinnedWitnessHeadSha256||'')
  ||!operators||!operatorKeyPins||!Number.isFinite(Date.parse(now||'')))
  throw Error('Externally pinned nonrelease decision history required');
 let previous=independentlyPinnedGenesisSha256,priorAt=-Infinity;const seen=new Set(),roles=new Set();
 for(let i=0;i<entries.length;i++){
  const {record,operator_signature,auditor_signature}=entries[i]||{};
  const msg=canonicalP14Stage(record),at=Date.parse(record.issued_at);
  if(record.stage!==['precutover','postrelease'][i]||record.previous_stage_sha256!==previous
   ||record.source_sha!==expectedSourceSha||record.artifact_sha256!==expectedArtifactSha
   ||record.witness_head_sha256!==independentlyPinnedWitnessHeadSha256
   ||at<=priorAt||at>Date.parse(now)||seen.has(record.nonce))
   throw Error('Replay, source substitution or cross-stage authorization crossover');
  const op=record.operator_id,aud=record.auditor_id;
  if(!Object.hasOwn(operators,op)||!Object.hasOwn(operators,aud)
   ||!H.test(operatorKeyPins[op]||'')||!H.test(operatorKeyPins[aud]||'')
   ||operatorKeyPins[op]===operatorKeyPins[aud]
   ||sha(operators[op])!==operatorKeyPins[op]||sha(operators[aud])!==operatorKeyPins[aud]
   ||!verifySig(operators[op],msg,operator_signature)
   ||!verifySig(operators[aud],msg,auditor_signature))
   throw Error('Operator/auditor independent stage signatures invalid');
  roles.add(op);roles.add(aud);seen.add(record.nonce);
  previous=sha(msg);priorAt=at;
 }
 if(previous!==independentlyPinnedHeadSha256)
  throw Error('Latest independent stage head is missing or substituted');
 return {schema:'control-p14-decision-stage-audit-v1',stage_records_verified:2,
  roles_involved:roles.size,source_sha:expectedSourceSha,
  decision:'DENY',precutover_authorized:false,postrelease_authorized:false,
  rollback_authorized:false,release_authorized:false,
  merge_authorized:false,deployment_authorized:false,migration_authorized:false,
  actual_human_signoff_verified:false};
}
