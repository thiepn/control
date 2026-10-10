// Cross-source revocation + signer-compromise quarantine; signed claims never prove human consent.
import {auditP15ConsentHistory} from './p15-consent.mjs';
import {auditCompromiseChronology} from './p12-compromise.mjs';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/;
export function reconcileP16Quarantine({consentContext,incidentContext,
  independentlyPinnedConsentHead,independentlyPinnedIncidentHead,
  expectedSourceSha,expectedArtifactSha,now}){
 if(!S.test(expectedSourceSha||'')||!H.test(expectedArtifactSha||'')
  ||!H.test(independentlyPinnedConsentHead||'')||!H.test(independentlyPinnedIncidentHead||'')
  ||consentContext?.pinnedHeadSha256!==independentlyPinnedConsentHead
  ||incidentContext?.pinnedHeadSha256!==independentlyPinnedIncidentHead)
  throw Error('Out-of-band consent and incident custody heads required');
 const incident=auditCompromiseChronology({...incidentContext,
  expectedSourceSha,expectedArtifactSha,now});
 const bad=[...new Set([...incident.compromised_key_ids,...incident.revoked_key_ids])];
 // ALL historical signatures from a compromised or revoked signer require independent reissue.
 const consent=auditP15ConsentHistory({...consentContext,expectedSourceSha,
  expectedArtifactSha,compromisedSignerIds:bad,now});
 const quarantined=consent.revoked_claims>0||bad.length>0;
 return {schema:'control-p16-consent-quarantine-v1',
  source_sha:expectedSourceSha,consent_head_sha256:independentlyPinnedConsentHead,
  incident_head_sha256:independentlyPinnedIncidentHead,
  claims_verified:consent.records_verified,withdrawals:consent.revoked_claims,
  signer_incidents:bad.length,quarantine_required:quarantined,
  reissued_human_consent_verified:false,actual_subject_identity_verified:false,
  source_ownership_verified:false,release_authorized:false,
  status:quarantined?'QUARANTINED':'AWAITING_REAL_HUMAN_ACCEPTANCE'};
}
