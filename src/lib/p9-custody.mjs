// P9: offline independently signed custody. Never authorizes production changes.
import {createPublicKey,verify} from 'node:crypto';
import {sha256,verifyLedger} from './p8-decision.mjs';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/,N=/^[a-f0-9]{32}$/;
export function canonicalCheckpoint(a){
 if(!a||a.schema!=='control-p9-custody-v1'||!S.test(a.source_sha||'')
  ||!H.test(a.artifact_sha256||'')||!H.test(a.ledger_head_sha256||'')
  ||!H.test(a.previous_checkpoint_sha256||'')||!N.test(a.nonce||'')
  ||!Number.isSafeInteger(a.entry_count)||a.entry_count<1
  ||!(/^[A-Za-z0-9._@-]{3,80}$/).test(a.custodian||'')
  ||typeof a.issued_at!=='string'
  ||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(a.issued_at)
  ||!Number.isFinite(Date.parse(a.issued_at))
  ||new Date(a.issued_at).toISOString()!==a.issued_at)
  throw Error('Malformed independently signed custody checkpoint');
 return JSON.stringify({schema:a.schema,source_sha:a.source_sha,
  artifact_sha256:a.artifact_sha256,ledger_head_sha256:a.ledger_head_sha256,
  previous_checkpoint_sha256:a.previous_checkpoint_sha256,
  entry_count:a.entry_count,nonce:a.nonce,custodian:a.custodian,issued_at:a.issued_at});
}
export function verifyIndependentCustody({checkpoint,signature,publicKeyPem,ledger,
 sourceSha,artifactSha,pinnedPreviousCheckpointSha256,now}){
 if(!S.test(sourceSha||'')||!H.test(artifactSha||'')
  ||!H.test(pinnedPreviousCheckpointSha256||'')||!Number.isFinite(Date.parse(now||'')))
  throw Error('Independent source/artifact/time and previous checkpoint pin required');
 const canonical=canonicalCheckpoint(checkpoint),head=verifyLedger(ledger);
 if(checkpoint.source_sha!==sourceSha||checkpoint.artifact_sha256!==artifactSha)
  throw Error('Custody source or artifact mismatch');
 if(checkpoint.previous_checkpoint_sha256!==pinnedPreviousCheckpointSha256)
  throw Error('Independently pinned previous checkpoint mismatch');
 if(checkpoint.entry_count!==ledger.entries.length||checkpoint.ledger_head_sha256!==head)
  throw Error('Custody ledger truncated, altered or replaced');
 if(Date.parse(checkpoint.issued_at)>Date.parse(now))throw Error('Future checkpoint is invalid');
 let signed=false;
 try{
  const key=createPublicKey(publicKeyPem);
  if(key.asymmetricKeyType!=='ed25519'||typeof signature!=='string'
   ||!/^[A-Za-z0-9+/]{86}==$/.test(signature))throw Error('Invalid signature encoding');
  signed=verify(null,Buffer.from(canonical),key,Buffer.from(signature,'base64'));
 }catch{signed=false;}
 if(!signed)throw Error('Independently trusted custodian signature invalid');
 return {verified:true,checkpoint_sha256:sha256(canonical),entries_verified:checkpoint.entry_count,
  releaseAuthorized:false,deploymentAuthorized:false,
  note:'Offline evidence continuity only; independently pin new checkpoint hash externally'};
}
