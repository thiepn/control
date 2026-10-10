// Offline operator decision verifier. Never authorizes or triggers deployment.
// A trusted operator must sign each exact source/artifact-specific decision externally.
import {createHash,createPublicKey,verify} from 'node:crypto';
import {REQUIRED_GATES} from './p7-release.mjs';
const SHA=/^[a-f0-9]{64}$/,HEAD=/^[a-f0-9]{40}$/,NONCE=/^[a-f0-9]{32}$/;
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export function canonicalDecision(d){
 if(!d||d.schema!=='control-p8-decision-v1'||!HEAD.test(d.source_sha||'')||
   !SHA.test(d.artifact_sha256||'')||!NONCE.test(d.nonce||'')||
   !['approve_review_only','reject'].includes(d.decision)||
   !/^[a-zA-Z0-9._@-]{3,80}$/.test(d.operator||'')||
   !Number.isFinite(Date.parse(d.issued_at))||!Number.isFinite(Date.parse(d.expires_at))||
   typeof d.reason!=='string'||d.reason.length>240||
   !Array.isArray(d.gates)||d.gates.length!==REQUIRED_GATES.length||
   !REQUIRED_GATES.every((g,i)=>d.gates[i]?.id===g &&
     (d.gates[i].status==='accepted'||d.gates[i].status==='rejected') &&
     SHA.test(d.gates[i].evidence_sha256||'')))
  throw Error('Malformed release-decision attestation');
 return JSON.stringify({schema:d.schema,source_sha:d.source_sha,artifact_sha256:d.artifact_sha256,
  nonce:d.nonce,decision:d.decision,operator:d.operator,
  issued_at:d.issued_at,expires_at:d.expires_at,reason:d.reason,
  gates:d.gates.map(g=>({id:g.id,status:g.status,evidence_sha256:g.evidence_sha256}))});
}
export function verifyLedger(ledger){
 if(!ledger||ledger.schema!=='control-p8-ledger-v1'||!Array.isArray(ledger.entries))
  throw Error('Invalid ledger');
 let last='0'.repeat(64),index=0;const nonces=new Set();
 for(const entry of ledger.entries){
  const plain={index,previous_sha256:last,nonce_sha256:entry.nonce_sha256,
   attestation_sha256:entry.attestation_sha256,decision:entry.decision,
   source_sha:entry.source_sha,artifact_sha256:entry.artifact_sha256};
  if(entry.index!==index||entry.previous_sha256!==last||
    !SHA.test(entry.nonce_sha256||'')||!SHA.test(entry.attestation_sha256||'')||
    !HEAD.test(entry.source_sha||'')||!SHA.test(entry.artifact_sha256||'')||
    !['approve_review_only','reject'].includes(entry.decision)||
    entry.entry_sha256!==sha256(JSON.stringify(plain))||nonces.has(entry.nonce_sha256))
   throw Error('Tampered, repeated or out-of-order release ledger');
  nonces.add(entry.nonce_sha256);last=entry.entry_sha256;index++;
 }
 return last;
}
export function reviewOperatorDecision({attestation,signature,publicKeyPem,sourceSha,artifactSha,now,ledger}){
 // These records are NEVER an automatic release, even after a genuine signed approval.
 const refusal=(reason)=>({recordable:false,reasons:[reason],releaseAuthorized:false,deploymentAuthorized:false});
 let canonical;
 try{canonical=canonicalDecision(attestation);verifyLedger(ledger);}catch{return refusal('Malformed attestation or ledger');}
 if(!HEAD.test(sourceSha||'')||!SHA.test(artifactSha||'')||
   attestation.source_sha!==sourceSha||attestation.artifact_sha256!==artifactSha)
  return refusal('Exact source or artifact digest mismatch');
 if(!Number.isFinite(Date.parse(now))||
   Date.parse(attestation.issued_at)>Date.parse(now)||
   Date.parse(attestation.expires_at)<=Date.parse(now)||
   Date.parse(attestation.expires_at)-Date.parse(attestation.issued_at)>3600000)
  return refusal('Invalid or expired one-hour attestation window');
 if(attestation.decision==='approve_review_only' &&
   attestation.gates.some(g=>g.status!=='accepted'))
  return refusal('Mandatory external acceptance evidence not approved');
 if(ledger.entries.some(e=>e.nonce_sha256===sha256(attestation.nonce)))
  return refusal('Operator decision nonce already consumed');
 let signed=false;
 try{
  const key=createPublicKey(publicKeyPem);
  if(key.asymmetricKeyType!=='ed25519'||typeof signature!=='string'||
    !/^[A-Za-z0-9+/]{86}==$/.test(signature))throw Error('Invalid signer');
  signed=verify(null,Buffer.from(canonical),key,Buffer.from(signature,'base64'));
 }catch{signed=false;}
 if(!signed)return refusal('Detached trusted Ed25519 signature missing or invalid');
 const index=ledger.entries.length;
 const plain={index,previous_sha256:verifyLedger(ledger),
  nonce_sha256:sha256(attestation.nonce),attestation_sha256:sha256(canonical),
  decision:attestation.decision,source_sha:sourceSha,artifact_sha256:artifactSha};
 const entry={...plain,entry_sha256:sha256(JSON.stringify(plain))};
 return {recordable:true,reasons:[],entry,releaseAuthorized:false,deploymentAuthorized:false,
  note:'Authorized only for offline review-ledger recording. Separate explicit release approval remains mandatory.'};
}
export function emptyLedger(){return {schema:'control-p8-ledger-v1',entries:[]};}
