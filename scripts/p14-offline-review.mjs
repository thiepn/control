// LOCAL only: independently supplied records outside the public repo; metadata check, never release.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {outsidePublicRepo} from './p11-offline-operator-audit.mjs';
import {reconcileP14Containment} from '../src/lib/p14-containment.mjs';
import {reconcileP14Handoff} from '../src/lib/p14-handoff.mjs';
import {auditP14DecisionStages} from '../src/lib/p14-isolation.mjs';
import {reconcileP14BuildProvenance} from '../src/lib/p14-recovery-build.mjs';
if(process.argv[1]?.endsWith('p14-offline-review.mjs')){
 const e=process.env;
 if(e.CI==='true')throw Error('Do not import private human/device/rights evidence in public CI');
 const necessary=['P14_PRIVATE_BUNDLE','P14_EXPECTED_SOURCE_SHA','P14_EXPECTED_ARTIFACT_SHA256',
  'P14_PINNED_INCIDENT_HEAD_SHA256','P14_PINNED_WITNESS_HEAD_SHA256',
  'P14_PINNED_STAGE_GENESIS_SHA256','P14_PINNED_STAGE_HEAD_SHA256',
  'P14_PINNED_BUILD_TREE_SHA','P14_PINNED_BUILD_EXECUTABLE_SHA256',
  'P14_PINNED_BUILD_IMAGE_SHA256'];
 for(const k of necessary)if(!e[k])throw Error('Independent pin missing: '+k);
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(head!==e.P14_EXPECTED_SOURCE_SHA)throw Error('Checked-out SHA is not independently pinned');
 const bundle=JSON.parse(readFileSync(outsidePublicRepo(e.P14_PRIVATE_BUNDLE),'utf8'));
 const expectedSourceSha=head,expectedArtifactSha=e.P14_EXPECTED_ARTIFACT_SHA256,now=new Date().toISOString();
 const incident=reconcileP14Containment({...bundle.containment,expectedSourceSha,
  expectedArtifactSha,now,independentlyPinnedIncidentHead:e.P14_PINNED_INCIDENT_HEAD_SHA256,
  independentlyPinnedWitnessHead:e.P14_PINNED_WITNESS_HEAD_SHA256});
 const handoff=reconcileP14Handoff({...bundle.handoff,expectedSourceSha,expectedArtifactSha,
  independentlyPinnedCustodyHeadSha256:e.P14_PINNED_WITNESS_HEAD_SHA256});
 const stage=auditP14DecisionStages({...bundle.stages,expectedSourceSha,expectedArtifactSha,now,
  independentlyPinnedGenesisSha256:e.P14_PINNED_STAGE_GENESIS_SHA256,
  independentlyPinnedHeadSha256:e.P14_PINNED_STAGE_HEAD_SHA256,
  independentlyPinnedWitnessHeadSha256:e.P14_PINNED_WITNESS_HEAD_SHA256});
 const image=reconcileP14BuildProvenance({...bundle.build,independentlyPinnedSourceSha:head,
  independentlyPinnedTreeSha:e.P14_PINNED_BUILD_TREE_SHA,
  independentlyPinnedExecutableSha256:e.P14_PINNED_BUILD_EXECUTABLE_SHA256,
  independentlyPinnedImageSha256:e.P14_PINNED_BUILD_IMAGE_SHA256});
 if(incident.release_authorized||handoff.release_authorized||stage.release_authorized||image.release_authorized)
  throw Error('Offline metadata cannot authorize a production action');
 console.log('P14 external metadata reviewed: '+handoff.requested+' off-Git requests, '+
  stage.stage_records_verified+' nonrelease stage records, '+image.claim_count+
  ' unverified external builder claims. All genuine human/device/rights and production gates OPEN. DENY.');
}
