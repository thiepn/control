// Release approval is offline, explicitly trusted, source-linked, and never an action endpoint.
// A self-reported device receipt cannot satisfy any gate.
import {createHash,createPublicKey,verify} from 'node:crypto';
export const REQUIRED_GATES=Object.freeze([
 'two_user_auth','android_device','ios_device','screen_reader','offline_recovery',
 'privacy_review','rollback_rehearsal'
]);
const sha40=/^[0-9a-f]{40}$/;
const sha256=/^[0-9a-f]{64}$/;
export const digest=body=>createHash('sha256').update(body).digest('hex');
export function validateDeviceReceipt(input){
 if(!input||!['android_chrome','ios_safari','nvda','voiceover','two_device','offline_recovery','rollback'].includes(input.surface)
 ||!sha40.test(input.source_sha||'')||!sha256.test(input.evidence_sha256||'')
 ||typeof input.observation!=='string'||!input.observation.trim()
 ||input.observation.length>500||/[\u0000-\u001f]/.test(input.observation))
  throw Error('Invalid device observation metadata');
 return {surface:input.surface,source_sha:input.source_sha,
  evidence_sha256:input.evidence_sha256,observation:input.observation.trim(),
  classification:'self_reported_unverified'};
}
export function canonicalAttestation(value){
 if(!value||value.schema!=='control-p7-operator-v1'
  ||!sha40.test(value.source_sha||'')||!sha256.test(value.artifact_sha256||'')
  ||typeof value.operator!=='string'||!/^[A-Za-z0-9._@-]{3,80}$/.test(value.operator)
  ||!Array.isArray(value.gates)||value.gates.length!==REQUIRED_GATES.length
  ||!REQUIRED_GATES.every((g,i)=>value.gates[i]===g)
  ||typeof value.issued_at!=='string'||typeof value.expires_at!=='string'
  ||!Number.isFinite(Date.parse(value.issued_at))||!Number.isFinite(Date.parse(value.expires_at)))
  throw Error('Invalid attestation');
 return JSON.stringify({schema:value.schema,source_sha:value.source_sha,
  artifact_sha256:value.artifact_sha256,gates:value.gates,
  operator:value.operator,issued_at:value.issued_at,expires_at:value.expires_at});
}
export function evaluateSignedReadiness({attestation,signature,publicKeyPem,sourceSha,artifactSha,now}){
 const reasons=[];
 if(!sha40.test(sourceSha||'')||!sha256.test(artifactSha||'')||!publicKeyPem
    ||!now||!Number.isFinite(Date.parse(now)))
  return {ready:false,reasons:['Missing trusted source/artifact identity or operator key'],deploymentAuthorized:false};
 let message;
 try{message=canonicalAttestation(attestation);}catch{return {ready:false,reasons:['Attestation invalid'],deploymentAuthorized:false};}
 if(attestation.source_sha!==sourceSha)reasons.push('Source head mismatch');
 if(attestation.artifact_sha256!==artifactSha)reasons.push('Artifact digest mismatch');
 if(Date.parse(attestation.issued_at)>Date.parse(now)||Date.parse(attestation.expires_at)<Date.parse(now)
    ||Date.parse(attestation.expires_at)-Date.parse(attestation.issued_at)>86400000)
   reasons.push('Attestation expired, not yet valid, or overly broad');
 let valid=false;
 try{
  if(typeof signature!=='string'||!/^[a-zA-Z0-9+/]{86}==$/.test(signature))throw Error('Signature missing');
  const pub=createPublicKey(publicKeyPem);
  if(pub.asymmetricKeyType!=='ed25519')throw Error('Not Ed25519');
  valid=verify(null,Buffer.from(message),pub,Buffer.from(signature,'base64'));
 }catch{valid=false;}
 if(!valid)reasons.push('Trusted operator signature missing or invalid');
 return {ready:reasons.length===0,reasons,
  deploymentAuthorized:false, // Readiness NEVER causes a merge, migration or deploy.
  interpretation:'Signed external review only; explicit release command remains separately authorized'};
}
