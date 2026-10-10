// Optional operator-local verification only; no remote I/O, keys, authorizations, CI or live data.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {outsidePublicRepo} from './p11-offline-operator-audit.mjs';
import {auditCompromiseChronology} from '../src/lib/p12-compromise.mjs';
import {auditProvenanceChain} from '../src/lib/p12-provenance.mjs';
import {verifyExternalWitness} from '../src/lib/p12-witness.mjs';
if(process.argv[1]?.endsWith('p12-offline-audit.mjs')){
 const e=process.env;
 if(e.CI==='true')throw Error('Private witness inspection prohibited in public CI');
 const required=['P12_PRIVATE_AUDIT_BUNDLE','P12_EXPECTED_HEAD','P12_EXPECTED_ARTIFACT_SHA256',
  'P12_PINNED_INCIDENT_ROOT_SHA256','P12_PINNED_INCIDENT_GENESIS_SHA256',
  'P12_PINNED_INCIDENT_HEAD_SHA256','P12_PINNED_PROVENANCE_GENESIS_SHA256',
  'P12_PINNED_PROVENANCE_HEAD_SHA256','P12_PINNED_WITNESS_KEY_SHA256',
  'P12_PINNED_WITNESS_CUSTODY_SHA256'];
 for(const k of required)if(!e[k])throw Error('Independent operator source, object and custody pin missing: '+k);
 const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(e.P12_EXPECTED_HEAD!==sourceSha)throw Error('External source pin differs from checked-out SHA');
 const bundle=JSON.parse(readFileSync(outsidePublicRepo(e.P12_PRIVATE_AUDIT_BUNDLE),'utf8'));
 const now=new Date().toISOString();
 auditCompromiseChronology({...bundle.incidents,now,expectedSourceSha:sourceSha,
  expectedArtifactSha:e.P12_EXPECTED_ARTIFACT_SHA256,
  pinnedRootSha256:e.P12_PINNED_INCIDENT_ROOT_SHA256,
  pinnedGenesisSha256:e.P12_PINNED_INCIDENT_GENESIS_SHA256,
  pinnedHeadSha256:e.P12_PINNED_INCIDENT_HEAD_SHA256});
 auditProvenanceChain({...bundle.provenance,now,expectedSourceSha:sourceSha,
  expectedArtifactSha:e.P12_EXPECTED_ARTIFACT_SHA256,
  pinnedGenesisSha256:e.P12_PINNED_PROVENANCE_GENESIS_SHA256,
  pinnedHeadSha256:e.P12_PINNED_PROVENANCE_HEAD_SHA256});
 for(const witness of bundle.witnesses||[]){
  verifyExternalWitness({...witness,now,expectedSourceSha:sourceSha,
   expectedArtifactSha:e.P12_EXPECTED_ARTIFACT_SHA256,
   pinnedWitnessKeySha256:e.P12_PINNED_WITNESS_KEY_SHA256,
   pinnedCustodySha256:e.P12_PINNED_WITNESS_CUSTODY_SHA256});
 }
 console.log('P12 cryptographic metadata checks complete; genuine human/device/restore acceptance NOT proven; release DENIED.');
}
