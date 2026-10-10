// Offline evidence handoff only; no external requests and no release action.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {REQUIRED_GATES} from '../src/lib/p7-release.mjs';
import {assessHumanEvidence,composeReleaseProposal} from '../src/lib/p10-evidence.mjs';
export function offlineAcceptanceHandoff({sourceSha,artifactSha,evidenceRecords=[],trustedReviewers={},
 now=new Date().toISOString(),custodyVerified=false,sourceVerified=false,
 binaryVerified=false,isolatedRestoreVerified=false}){
 const assessment=assessHumanEvidence({records:evidenceRecords,sourceSha,artifactSha,now,trustedReviewers});
 const proposal=composeReleaseProposal({humanEvidence:assessment,custodyVerified,sourceVerified,
  binaryVerified,isolatedRestoreVerified});
 return {schema:'control-p10-review-handoff-v1',source_sha:sourceSha,
  artifact_sha256:artifactSha,reviewed_gate_count:assessment.reviewed_gate_count,
  missing_gates:proposal.missing_gates,
  release_authorized:false,deployment_authorized:false,merge_authorized:false,
  migrate_authorized:false,operator_decision:'DENY',
  note:'No human, physical or external-auth acceptance inferred; operator review only'};
}
if(process.argv[1]?.endsWith('p10-acceptance-handoff.mjs')){
 const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(sha!==process.env.CONTROL_P10_EXPECTED_HEAD)throw Error('Wrong exact reviewed head');
 // CI cannot inject any trusted signatures, live identities, or self-reported approvals.
 if(process.env.CI&&['P10_EXTERNAL_EVIDENCE_FILE','P10_TRUSTED_REVIEWERS_FILE'].some(k=>process.env[k]))
  throw Error('External private human evidence must never be used in public CI');
 const manifest=offlineAcceptanceHandoff({sourceSha:sha,artifactSha:'0'.repeat(64)});
 mkdirSync('release-evidence/p10',{recursive:true});
 writeFileSync('release-evidence/p10/acceptance-handoff.json',JSON.stringify(manifest,null,2)+'\n',
  {mode:0o600});
 console.log('P10 review-only handoff: '+manifest.missing_gates.length+
  ' release prerequisites OPEN, no approvals supplied or inferred');
}
