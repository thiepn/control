// Exact-head, nondeploying source-manifest generator and independent verifier.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {digest} from '../src/lib/p7-release.mjs';
export const files=[
 'package-lock.json','db/schema.sql','db/p1-app.sql','db/p2-progress.sql',
 'db/p3-github.sql','db/p4-recommendations.sql','db/p5-reviews.sql','db/p7-device-receipts.sql',
 'src/lib/p7-release.mjs','src/lib/p7-staging.mjs',
 'scripts/p7-rehearsal.mjs','scripts/p7-evaluate-operator.mjs',
 'src/app/api/p7/evidence/route.ts','src/components/DeviceEvidencePanel.tsx',
 'tests/browser/operations.fixture.spec.mjs',
 '.github/workflows/p7-qualification.yml','docs/15-p7-acceptance.md'
];
export function makeManifest(commit,now,read=readFileSync){
 if(!/^[0-9a-f]{40}$/.test(commit))throw Error('Exact Git head required');
 return {schema:'control-p7-review-only-v1',commit,created_at:now,
  inputs:files.map(path=>({path,sha256:digest(read(path))})),
  physical_device_acceptance:'NOT_COLLECTED',
  independent_screen_reader_acceptance:'NOT_COLLECTED',
  real_disposable_two_user_auth:'NOT_COLLECTED',
  trusted_operator_signature:'NOT_COLLECTED',
  release_authorized:false,merged:false,deployed:false,
  statement:'Source-only evidence; no human or device signoff is inferred'};
}
export function verifyManifest(manifest,expectedHead,read=readFileSync){
 if(!manifest||manifest.schema!=='control-p7-review-only-v1'
  ||manifest.commit!==expectedHead||manifest.release_authorized!==false
  ||manifest.merged!==false||manifest.deployed!==false
  ||manifest.physical_device_acceptance!=='NOT_COLLECTED'
  ||manifest.independent_screen_reader_acceptance!=='NOT_COLLECTED'
  ||manifest.real_disposable_two_user_auth!=='NOT_COLLECTED'
  ||manifest.trusted_operator_signature!=='NOT_COLLECTED'
  ||!Array.isArray(manifest.inputs)||manifest.inputs.length!==files.length)
  throw Error('Release gate or exact SHA mismatch');
 for(let i=0;i<files.length;i++){
  const item=manifest.inputs[i];
  if(item.path!==files[i]||item.sha256!==digest(read(item.path)))
   throw Error('Release input integrity mismatch');
 }
 return true;
}
if(process.argv[1]?.endsWith('p7-rehearsal.mjs')){
 const mode=process.argv[2]||'create';
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const expected=process.env.CONTROL_P7_EXPECTED_HEAD;
 if(!expected||! /^[0-9a-f]{40}$/.test(expected)||head!==expected)
  throw Error('P7 manifest must match the exact qualified source SHA, not a PR merge ref');
 const folder='release-evidence/p7';
 if(mode==='create'){
  const manifest=makeManifest(head,new Date().toISOString());
  mkdirSync(folder,{recursive:true});
  const json=JSON.stringify(manifest,null,2)+'\n';
  writeFileSync(join(folder,'manifest.json'),json,{mode:0o600});
  writeFileSync(join(folder,'SHA256SUMS'),digest(Buffer.from(json))+'  manifest.json\n',{mode:0o600});
  console.log('P7 review-only manifest generated; no real device/operator acceptance.');
 }else if(mode==='verify'){
  const manifest=JSON.parse(readFileSync(join(folder,'manifest.json'),'utf8'));
  verifyManifest(manifest,head);
  console.log('P7 all source-input hashes and exact-head identity verified.');
 }else throw Error('Unknown rehearsal mode');
}
