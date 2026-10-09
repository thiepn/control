// Pure non-deploying source-bound release handoff. No secrets or owner records read.
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
const OUT='release-evidence/p6';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function buildEvidence({commit,branch,now,files}){
 if(!/^[a-f0-9]{40}$/.test(commit)||!Array.isArray(files))throw Error('Invalid source identity');
 return {
  schema:'control-p6-rehearsal-v1',source:{commit,branch},generatedAt:now,
  inputs:files.map(path=>({path,sha256:hash(readFileSync(path))})),
  scope:'source and isolated fixture checks only; not a deployment',
  acceptance:{p6SourceBuild:'EVIDENCED_BY_CI_ONLY',
   syntheticDesktopMobileBrowser:'EVIDENCED_BY_SEPARATE_BROWSER_CI',
   syntheticPostgresConcurrency:'EVIDENCED_BY_SEPARATE_POSTGRES_CI',
   disposableTwoUserAuth:'NOT_COLLECTED',physicalAndroid:'NOT_COLLECTED',
   physicalIOS:'NOT_COLLECTED',screenReader:'NOT_COLLECTED',
   productionSecurityReview:'NOT_SIGNED',operatorApproval:'NOT_SIGNED'},
  release:{authorized:false,deployed:false,realMigrationsApplied:false,
   rollback:'docs/14-p6-acceptance.md#rollback-and-recovery',
   limitations:'CI and fixture screenshots never substitute for real Auth or human/device acceptance'}
 };
}
if(process.argv[1]?.endsWith('p6-rehearsal.mjs')){
 const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const branch=process.env.GITHUB_HEAD_REF||process.env.GITHUB_REF_NAME||'detached';
 const files=['package-lock.json','db/schema.sql','db/p1-app.sql','db/p2-progress.sql',
  'db/p3-github.sql','db/p4-recommendations.sql','db/p5-reviews.sql',
  '.github/workflows/p6-qualification.yml','docs/14-p6-acceptance.md'];
 const evidence=buildEvidence({commit,branch,now:new Date().toISOString(),files});
 mkdirSync(OUT,{recursive:true});
 const json=JSON.stringify(evidence,null,2)+'\n';
 writeFileSync(join(OUT,'manifest.json'),json,{mode:0o600});
 writeFileSync(join(OUT,'SHA256SUMS'),hash(Buffer.from(json))+'  manifest.json\n',{mode:0o600});
 const handoff='P6 NON-DEPLOYING RELEASE REHEARSAL\nSource: '+commit+
  '\nStatus: REVIEW ONLY; NOT AUTHORIZED; NOT DEPLOYED\nUnverified: two-user Auth, physical Android/iOS, screen reader and human signoff\n';
 writeFileSync(join(OUT,'HANDOFF.txt'),handoff,{mode:0o600});
 console.log('P6 source-only rehearsal created; no live mutation or release.');
}
