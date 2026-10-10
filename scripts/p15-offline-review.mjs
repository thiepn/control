// Operator-controlled OFFLINE metadata inspection. No browser, API, production or secrets.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {outsidePublicRepo} from './p11-offline-operator-audit.mjs';
import {reconcileP15ReviewPreparation,reconcileP15ExternalImagePreparation} from '../src/lib/p15-acceptance.mjs';
import {auditP15Freeze} from '../src/lib/p15-freeze.mjs';
if(process.argv[1]?.endsWith('p15-offline-review.mjs')){
 const e=process.env;
 if(e.CI==='true')throw Error('Do not import human consent/recovery packets into public CI');
 const required=['P15_PRIVATE_BUNDLE','P15_EXPECTED_SOURCE_SHA','P15_EXPECTED_ARTIFACT_SHA256',
  'P15_PINNED_REVIEW_HEAD','P15_PINNED_CONSENT_HEAD',
  'P15_PINNED_FREEZE_GENESIS','P15_PINNED_FREEZE_FINAL',
  'P15_PINNED_IMAGE_SHA256','P15_PINNED_TREE_SHA',
  'P15_PINNED_EXECUTABLE_SHA256'];
 for(const k of required)if(!e[k])throw Error('Independent external trust/source digest required: '+k);
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(head!==e.P15_EXPECTED_SOURCE_SHA)throw Error('Exact checkout differs from independently pinned source');
 const b=JSON.parse(readFileSync(outsidePublicRepo(e.P15_PRIVATE_BUNDLE),'utf8'));
 const expectedSourceSha=head,expectedArtifactSha256=e.P15_EXPECTED_ARTIFACT_SHA256,
  now=new Date().toISOString();
 const a=reconcileP15ReviewPreparation({...b.review,
  independentlyPinnedSourceSha:head,independentlyPinnedArtifactSha256:expectedArtifactSha256,
  independentlyPinnedHandoffHead:e.P15_PINNED_REVIEW_HEAD,
  independentlyPinnedConsentHead:e.P15_PINNED_CONSENT_HEAD,now});
 const f=auditP15Freeze({...b.freeze,expectedSourceSha:head,
  expectedArtifactSha:expectedArtifactSha256,
  independentlyPinnedConsentHead:e.P15_PINNED_CONSENT_HEAD,
  independentlyPinnedImageSha256:e.P15_PINNED_IMAGE_SHA256,
  independentlyPinnedGenesisSha256:e.P15_PINNED_FREEZE_GENESIS,
  independentlyPinnedFinalSha256:e.P15_PINNED_FREEZE_FINAL,now});
 const i=reconcileP15ExternalImagePreparation({...b.image,
  independentlyPinnedSourceSha:head,independentlyPinnedTreeSha:e.P15_PINNED_TREE_SHA,
  independentlyPinnedExecutableSha256:e.P15_PINNED_EXECUTABLE_SHA256,
  independentlyPinnedImageSha256:e.P15_PINNED_IMAGE_SHA256});
 if(a.release_authorized||f.release_authorized||i.release_authorized)
  throw Error('Never promote off-Git human, consent or image claims to production release');
 console.log('P15 OFFLINE: '+a.review_requests+' review requests, '+a.consent_claims_reviewed+
  ' signed consent claims, two DENY/HOLD stage receipts. Actual consent, hardware, restoration and release NOT COLLECTED.');
}
