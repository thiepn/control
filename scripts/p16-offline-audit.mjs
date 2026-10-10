// Local independent custodian reads one OFF-REPO private bundle only. No network or release action.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {outsidePublicRepo} from './p11-offline-operator-audit.mjs';
import {reconcileP16Quarantine} from '../src/lib/p16-quarantine.mjs';
import {prepareP16PhysicalCustody} from '../src/lib/p16-physical.mjs';
import {auditP16RecoveryClaims} from '../src/lib/p16-recovery.mjs';
import {auditP16ReleaseIsolation} from '../src/lib/p16-authority.mjs';
if(process.argv[1]?.endsWith('p16-offline-audit.mjs')){
 const e=process.env;
 if(e.CI==='true')throw Error('Private witness/rights consent metadata prohibited in public CI');
 const vars=['P16_PRIVATE_EVIDENCE_BUNDLE','P16_EXPECTED_SOURCE_SHA',
  'P16_EXPECTED_ARTIFACT_SHA256','P16_PINNED_CONSENT_HEAD','P16_PINNED_INCIDENT_HEAD',
  'P16_PINNED_REVIEW_HEAD','P16_PINNED_WITNESS_HEAD','P16_PINNED_RECOVERY_HEAD',
  'P16_PINNED_RECOVERY_GENESIS','P16_PINNED_ARCHIVE_SHA','P16_PINNED_PRIOR_STABLE_SHA',
  'P16_PINNED_BUILD_TREE','P16_PINNED_BUILD_EXECUTABLE_SHA',
  'P16_PINNED_PRODUCTION_IMAGE_SHA'];
 for(const k of vars)if(!e[k])throw Error('Independent out-of-band custody pin required: '+k);
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(head!==e.P16_EXPECTED_SOURCE_SHA)throw Error('Off-Git reviewer source pin mismatch');
 const b=JSON.parse(readFileSync(outsidePublicRepo(e.P16_PRIVATE_EVIDENCE_BUNDLE),'utf8'));
 const now=new Date().toISOString(),expectedSourceSha=head,
  expectedArtifactSha=e.P16_EXPECTED_ARTIFACT_SHA256;
 const q=reconcileP16Quarantine({...b.quarantine,expectedSourceSha,expectedArtifactSha,
  independentlyPinnedConsentHead:e.P16_PINNED_CONSENT_HEAD,
  independentlyPinnedIncidentHead:e.P16_PINNED_INCIDENT_HEAD,now});
 const h=prepareP16PhysicalCustody({...b.physical,expectedSourceSha,expectedArtifactSha,
  independentlyPinnedHandoffHead:e.P16_PINNED_REVIEW_HEAD,
  independentlyPinnedWitnessHead:e.P16_PINNED_WITNESS_HEAD,now});
 const r=auditP16RecoveryClaims({...b.recovery,expectedSourceSha,expectedArtifactSha,
  independentlyPinnedGenesisSha256:e.P16_PINNED_RECOVERY_GENESIS,
  independentlyPinnedHeadSha256:e.P16_PINNED_RECOVERY_HEAD,
  independentlyPinnedArchiveSha256:e.P16_PINNED_ARCHIVE_SHA,
  independentlyPinnedPriorStableSha256:e.P16_PINNED_PRIOR_STABLE_SHA,now});
 const d=auditP16ReleaseIsolation({...b.release,expectedSourceSha,expectedArtifactSha,
  independentlyPinnedConsentHead:e.P16_PINNED_CONSENT_HEAD,
  independentlyPinnedImageSha256:e.P16_PINNED_PRODUCTION_IMAGE_SHA,
  independentlyPinnedTreeSha:e.P16_PINNED_BUILD_TREE,
  independentlyPinnedExecutableSha256:e.P16_PINNED_BUILD_EXECUTABLE_SHA,
  quarantineStatus:q.status,now});
 if(q.release_authorized||h.release_authorized||r.release_authorized||d.release_authorized)
  throw Error('Externally signed metadata is never a real release certificate');
 console.log('P16 cryptographic metadata reconciled; '+q.withdrawals+' withdrawal claims, '+
  h.review_requests+' physical/rights requests and '+r.claims_verified+
  ' synthetic recovery stages. Actual human/production acceptance OPEN; DENY/HOLD.');
}
