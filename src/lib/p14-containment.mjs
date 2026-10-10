// Cross-audit containment: a signed historical record is not valid after signer compromise.
// No public CI key becomes an operator key; this checks synthetic metadata ONLY.
import {auditCompromiseChronology} from './p12-compromise.mjs';
import {auditP13WitnessIntake} from './p13-witness-intake.mjs';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/;
export function reconcileP14Containment({incidentContext,witnessContext,expectedSourceSha,
 expectedArtifactSha,now,independentlyPinnedIncidentHead,independentlyPinnedWitnessHead}){
 if(!S.test(expectedSourceSha||'')||!H.test(expectedArtifactSha||'')
  ||!H.test(independentlyPinnedIncidentHead||'')
  ||!H.test(independentlyPinnedWitnessHead||'')
  ||incidentContext?.pinnedHeadSha256!==independentlyPinnedIncidentHead
  ||witnessContext?.pinnedHeadSha256!==independentlyPinnedWitnessHead)
  throw Error('Independent incident/witness pins absent or substituted');
 const incident=auditCompromiseChronology({...incidentContext,expectedSourceSha,
  expectedArtifactSha,now});
 const compromised=new Set([...incident.compromised_key_ids,...incident.revoked_key_ids]);
 const affected=[];
 for(const {record} of witnessContext.entries||[]){
  if(!record||!record.observer_id||!record.auditor_id)
   throw Error('Missing externally supplied witness identity');
  if(compromised.has(record.observer_id)||compromised.has(record.auditor_id))
   affected.push({nonce:record.nonce,kind:record.kind});
 }
 // Fail closed instead of treating a valid signature from a revoked key as approval.
 if(affected.length)throw Error('Compromised/revoked signer appears in custody chain; independent replacement required');
 const witness=auditP13WitnessIntake({...witnessContext,expectedSourceSha,
  expectedArtifactSha,now});
 if(incident.release_authorized||witness.release_authorized)
  throw Error('Unexpected release promotion');
 return {schema:'control-p14-containment-v1',source_sha:expectedSourceSha,
  incident_head_sha256:independentlyPinnedIncidentHead,
  witness_head_sha256:independentlyPinnedWitnessHead,
  metadata_chains_checked:2,compromised_keys:compromised.size,
  cryptographic_metadata_consistent:true,physical_review_verified:false,
  human_approval_verified:false,release_authorized:false,
  note:'Independently pinned synthetic metadata consistency only; no actual operator signoff'};
}
