// Independent, strict increase in externally signed checkpoints; never signs its own evidence.
import {verifyIndependentCustody} from './p9-custody.mjs';
import {emptyLedger,verifyLedger} from './p8-decision.mjs';
export function verifyCustodyContinuity({previous,current,ledger,
 previousSignature,currentSignature,trustedPublicKeyPem,previousAnchorSha256,
 previousSourceSha,previousArtifactSha,currentSourceSha,currentArtifactSha,now}){
 if(!ledger||!Array.isArray(ledger.entries)||!previous||!current
  ||!Number.isSafeInteger(previous.entry_count)||previous.entry_count<1
  ||!Number.isSafeInteger(current.entry_count)||current.entry_count<=previous.entry_count
  ||previous.nonce===current.nonce
  ||Date.parse(previous.issued_at)>=Date.parse(current.issued_at))
  throw Error('Custody continuity requires strictly newer independent evidence');
 const priorLedger=emptyLedger();priorLedger.entries=ledger.entries.slice(0,previous.entry_count);
 verifyLedger(priorLedger);verifyLedger(ledger);
 const first=verifyIndependentCustody({checkpoint:previous,signature:previousSignature,
  publicKeyPem:trustedPublicKeyPem,ledger:priorLedger,sourceSha:previousSourceSha,
  artifactSha:previousArtifactSha,pinnedPreviousCheckpointSha256:previousAnchorSha256,now});
 const second=verifyIndependentCustody({checkpoint:current,signature:currentSignature,
  publicKeyPem:trustedPublicKeyPem,ledger,sourceSha:currentSourceSha,
  artifactSha:currentArtifactSha,pinnedPreviousCheckpointSha256:first.checkpoint_sha256,now});
 return {verified:true,prior_checkpoint_sha256:first.checkpoint_sha256,
  current_checkpoint_sha256:second.checkpoint_sha256,
  delta_entries:current.entry_count-previous.entry_count,
  releaseAuthorized:false,deploymentAuthorized:false,
  note:'Independently signed chronological ledger integrity only; never authorizes production'};
}
