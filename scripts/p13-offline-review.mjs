// Operator LOCAL and read-only. External file must be outside the public repo.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {outsidePublicRepo} from './p11-offline-operator-audit.mjs';
import {auditP13WitnessIntake} from '../src/lib/p13-witness-intake.mjs';
import {reviewP13OperatorAcknowledgment} from '../src/lib/p13-decision-separation.mjs';
import {auditP13ExternalBuilders} from '../src/lib/p13-external-build.mjs';
if(process.argv[1]?.endsWith('p13-offline-review.mjs')){
 const e=process.env;
 if(e.CI==='true')throw Error('Private human/device records forbidden in public CI');
 const needed=['P13_PRIVATE_BUNDLE','P13_EXPECTED_SOURCE_SHA','P13_EXPECTED_ARTIFACT_SHA256',
  'P13_PINNED_WITNESS_GENESIS_SHA256','P13_PINNED_WITNESS_HEAD_SHA256',
  'P13_PINNED_TRUST_HEAD_SHA256','P13_PINNED_TREE_SHA',
  'P13_PINNED_EXECUTABLE_SHA256'];
 for(const name of needed)if(!e[name])throw Error('Missing independently supplied source/trust pin: '+name);
 const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(source!==e.P13_EXPECTED_SOURCE_SHA)throw Error('Public source SHA differs from independent pin');
 const bundle=JSON.parse(readFileSync(outsidePublicRepo(e.P13_PRIVATE_BUNDLE),'utf8'));
 const now=new Date().toISOString();
 const audit=auditP13WitnessIntake({...bundle.witnesses,
  expectedSourceSha:source,expectedArtifactSha:e.P13_EXPECTED_ARTIFACT_SHA256,
  pinnedGenesisSha256:e.P13_PINNED_WITNESS_GENESIS_SHA256,
  pinnedHeadSha256:e.P13_PINNED_WITNESS_HEAD_SHA256,now});
 const operators=reviewP13OperatorAcknowledgment({...bundle.operator_review,
  expectedSourceSha:source,expectedArtifactSha:e.P13_EXPECTED_ARTIFACT_SHA256,
  pinnedWitnessHeadSha256:e.P13_PINNED_WITNESS_HEAD_SHA256,
  pinnedTrustHeadSha256:e.P13_PINNED_TRUST_HEAD_SHA256,now});
 const build=auditP13ExternalBuilders({...bundle.external_build_claims,
  expectedSourceSha:source,expectedTreeSha:e.P13_PINNED_TREE_SHA,
  expectedExecutableSha256:e.P13_PINNED_EXECUTABLE_SHA256});
 if(operators.decision!=='DENY'||audit.release_authorized||build.release_authorized)
  throw Error('Private metadata cannot authorize release');
 console.log('P13 verified '+audit.records_verified+' custody metadata entries, two nonrelease signatures, '+
  build.distinct_organization_claims_verified+' builder claims. Release DENIED, human facts unverified.');
}
