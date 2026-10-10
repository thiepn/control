// Independent custodian LOCAL ONLY. Requires an off-repository private bundle and out-of-band pins.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {outsidePublicRepo} from './p11-offline-operator-audit.mjs';
import {auditP17OriginalWitnesses} from '../src/lib/p17-governance.mjs';
import {auditP17Rotations} from '../src/lib/p17-rotation.mjs';
import {auditP17FrozenCandidate} from '../src/lib/p17-candidate.mjs';
import {auditP17RecoveryHandoff} from '../src/lib/p17-recovery-handoff.mjs';
if(process.argv[1]?.endsWith('p17-offline-audit.mjs')){
 const e=process.env;if(e.CI==='true')throw Error('Never import private device/consent evidence into public CI');
 const keys=['P17_PRIVATE_PACKET','P17_EXPECTED_HEAD','P17_EXPECTED_ARTIFACT_SHA256',
  'P17_PINNED_WITNESS_GENESIS','P17_PINNED_WITNESS_HEAD',
  'P17_PINNED_ROOT_SHA256','P17_PINNED_ROTATION_GENESIS','P17_PINNED_ROTATION_HEAD',
  'P17_PINNED_CANDIDATE_SHA256','P17_PINNED_RECOVERY_GENESIS',
  'P17_PINNED_RECOVERY_HEAD','P17_PINNED_ARCHIVE_SHA256','P17_PINNED_PRIOR_STABLE_SHA256'];
 for(const k of keys)if(!e[k])throw Error('Out-of-band external human/custodian trust pin missing: '+k);
 const expectedSourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(expectedSourceSha!==e.P17_EXPECTED_HEAD)throw Error('Checked-out source differs from externally pinned HEAD');
 const expectedArtifactSha=e.P17_EXPECTED_ARTIFACT_SHA256,now=new Date().toISOString();
 const packet=JSON.parse(readFileSync(outsidePublicRepo(e.P17_PRIVATE_PACKET),'utf8'));
 const rotation=auditP17Rotations({...packet.rotation,expectedSourceSha,expectedArtifactSha,
  pinnedRootSha256:e.P17_PINNED_ROOT_SHA256,
  pinnedGenesisSha256:e.P17_PINNED_ROTATION_GENESIS,
  pinnedHeadSha256:e.P17_PINNED_ROTATION_HEAD,now});
 const records=auditP17OriginalWitnesses({...packet.original,expectedSourceSha,
  expectedArtifactSha,pinnedGenesisSha256:e.P17_PINNED_WITNESS_GENESIS,
  pinnedHeadSha256:e.P17_PINNED_WITNESS_HEAD,
  pinnedCandidateSha256:e.P17_PINNED_CANDIDATE_SHA256,
  revokedSignerIds:rotation.untrusted_key_ids,now});
 const recovery=auditP17RecoveryHandoff({...packet.recovery,expectedSourceSha,
  expectedArtifactSha,independentlyPinnedRecoveryGenesis:e.P17_PINNED_RECOVERY_GENESIS,
  independentlyPinnedRecoveryHead:e.P17_PINNED_RECOVERY_HEAD,
  independentlyPinnedArchiveSha256:e.P17_PINNED_ARCHIVE_SHA256,
  independentlyPinnedPriorStableSha256:e.P17_PINNED_PRIOR_STABLE_SHA256,now});
 const candidate=auditP17FrozenCandidate({...packet.candidate,
  independentlyPinnedCandidateSha256:e.P17_PINNED_CANDIDATE_SHA256,
  revokedSignerIds:rotation.untrusted_key_ids,now});
 if(records.release_authorized||recovery.release_authorized||candidate.release_authorized)
  throw Error('Off-Git witness/restore metadata must never promote release');
 console.log('P17 verified '+records.claims_verified+' synthetic original custody claims and '+
  recovery.custody_claims_verified+' unverified recovery stages. Human approval and production release DENIED.');
}
