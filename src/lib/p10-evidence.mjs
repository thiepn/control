// P10 offline, source-bound human evidence review. NEVER grants deployment authority.
import {createPublicKey,verify} from 'node:crypto';
import {REQUIRED_GATES} from './p7-release.mjs';
import {sha256} from './p8-decision.mjs';
const SHA=/^[0-9a-f]{40}$/,DIGEST=/^[0-9a-f]{64}$/,NONCE=/^[0-9a-f]{32}$/;
const REVIEWER=/^[a-zA-Z0-9._@-]{3,80}$/;
export function canonicalEvidence(e){
 if(!e||e.schema!=='control-p10-evidence-v1'
  ||!REQUIRED_GATES.includes(e.gate)||!SHA.test(e.source_sha||'')
  ||!DIGEST.test(e.artifact_sha256||'')||!DIGEST.test(e.evidence_sha256||'')
  ||!NONCE.test(e.nonce||'')||!REVIEWER.test(e.reviewer||'')
  ||e.classification!=='independently_reviewed'
  ||e.status!=='accepted_for_review'
  ||typeof e.issued_at!=='string'||typeof e.expires_at!=='string'
  ||!Number.isFinite(Date.parse(e.issued_at))||!Number.isFinite(Date.parse(e.expires_at))
  ||!new Date(e.issued_at).toISOString().startsWith(e.issued_at.replace(/Z$/,''))
  ||!Number.isFinite(Date.parse(e.expires_at)))
  throw Error('Malformed external human acceptance record');
 return JSON.stringify({schema:e.schema,gate:e.gate,source_sha:e.source_sha,
  artifact_sha256:e.artifact_sha256,evidence_sha256:e.evidence_sha256,
  nonce:e.nonce,reviewer:e.reviewer,classification:e.classification,
  status:e.status,issued_at:e.issued_at,expires_at:e.expires_at});
}
function verifyRecord(input,sourceSha,artifactSha,now,trustedReviewers){
 const {record,signature}=input||{};
 const message=canonicalEvidence(record);
 if(record.source_sha!==sourceSha||record.artifact_sha256!==artifactSha)
  throw Error('Independent evidence source or artifact mismatch');
 if(Date.parse(record.issued_at)>Date.parse(now)
  ||Date.parse(record.expires_at)<=Date.parse(now)
  ||Date.parse(record.expires_at)<=Date.parse(record.issued_at)
  ||Date.parse(record.expires_at)-Date.parse(record.issued_at)>3600000)
  throw Error('Evidence review expired or exceeds 1 hour');
 if(!Object.hasOwn(trustedReviewers,record.reviewer))
  throw Error('Reviewer is not independently trusted');
 let valid=false;
 try{
  const key=createPublicKey(trustedReviewers[record.reviewer]);
  if(key.asymmetricKeyType!=='ed25519'||typeof signature!=='string'
   ||!/^[a-zA-Z0-9+/]{86}==$/.test(signature))throw Error('Bad signature');
  valid=verify(null,Buffer.from(message),key,Buffer.from(signature,'base64'));
 }catch{valid=false;}
 if(!valid)throw Error('External evidence signature invalid');
 return record;
}
export function assessHumanEvidence({records,sourceSha,artifactSha,now,trustedReviewers}){
 if(!SHA.test(sourceSha||'')||!DIGEST.test(artifactSha||'')
  ||!Number.isFinite(Date.parse(now||''))
  ||!trustedReviewers||typeof trustedReviewers!=='object'
  ||!Array.isArray(records))throw Error('Trusted exact-head human evidence context required');
 const seen=new Set(),nonces=new Set();
 const accepted=[];
 for(const item of records){
  const r=verifyRecord(item,sourceSha,artifactSha,now,trustedReviewers);
  if(seen.has(r.gate)||nonces.has(r.nonce))
   throw Error('Duplicate gate or replayed evidence nonce');
  seen.add(r.gate);nonces.add(r.nonce);accepted.push(r.gate);
 }
 const missing=REQUIRED_GATES.filter(x=>!seen.has(x));
 return {schema:'control-p10-assessment-v1',source_sha:sourceSha,
  artifact_sha256:artifactSha,reviewed_gate_count:accepted.length,
  missing_gates:missing,eligibleForManualReview:missing.length===0,
  releaseAuthorized:false,deploymentAuthorized:false,
  note:'Offline metadata and trusted signatures only. Manual release remains separately denied'};
}
export function composeReleaseProposal({humanEvidence,custodyVerified,sourceVerified,binaryVerified,
 isolatedRestoreVerified,explicitReleaseAuthorization}){
 // This artifact is a REVIEW REQUEST, not an executable production decision.
 // A user-supplied explicitReleaseAuthorization cannot promote it to a release.
 if(!humanEvidence||humanEvidence.schema!=='control-p10-assessment-v1'
  ||!SHA.test(humanEvidence.source_sha||'')
  ||!DIGEST.test(humanEvidence.artifact_sha256||'')
  ||!Array.isArray(humanEvidence.missing_gates)
  ||typeof humanEvidence.reviewed_gate_count!=='number'
  ||humanEvidence.releaseAuthorized!==false)
  throw Error('Valid evidence assessment required');
 const open=[
  ...humanEvidence.missing_gates,
  ...(custodyVerified===true?[]:['independent_custody']),
  ...(sourceVerified===true?[]:['source_integrity']),
  ...(binaryVerified===true?[]:['build_reproducibility']),
  ...(isolatedRestoreVerified===true?[]:['isolated_restore']),
  'separate_authorized_release_command'
 ];
 return {schema:'control-p10-release-proposal-v1',source_sha:humanEvidence.source_sha,
  artifact_sha256:humanEvidence.artifact_sha256,missing_gates:open,
  human_review_eligible:open.length===1,
  decision:'DENY',release_authorized:false,deployment_authorized:false,
  merge_authorized:false,migrate_authorized:false,
  explicitReleaseAuthorizationIgnored:explicitReleaseAuthorization===true,
  note:'No automatic approval, deploy, migration or merge paths'};
}
