// No real keys, no network requests, no deploy. CI build outputs are transient digests only.
import {execFileSync} from 'node:child_process';
import {readdirSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {binaryDigest} from '../src/lib/p10-binary.mjs';
import {sealWorkerManifest} from '../src/lib/p11-independent-build.mjs';
function walk(dir,result=[]){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  const path=join(dir,entry.name);
  if(entry.isSymbolicLink())throw Error('Compiled symlink prohibited: '+path);
  if(entry.isDirectory())walk(path,result);
  else if(entry.isFile()&&/\.(js|mjs|css|wasm)$/.test(entry.name))
   result.push({path:path.replaceAll('\\','/'),sha256:binaryDigest(readFileSync(path))});
  else if(!entry.isFile())throw Error('Nonregular compiled artifact');
 }
 return result;
}
if(process.argv[1]?.endsWith('p11-build-runner.mjs')){
 const e=process.env,sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim();
 if(e.CI!=='true'||e.CONTROL_P11_EXPECTED_HEAD!==sha
  ||e.CONTROL_P10_EXPECTED_HEAD!==sha
  ||e.CONTROL_P10_BUILD_HEAD!==sha
  ||e.P11_SYNTHETIC_BUILD_ONLY!=='YES_NEVER_DEPLOY')
  throw Error('CI-only exact source and nonproduction build identity required');
 const record=sealWorkerManifest({worker:e.P11_BUILD_WORKER,
  runnerName:e.RUNNER_NAME,runId:Number(e.GITHUB_RUN_ID),
  runAttempt:Number(e.GITHUB_RUN_ATTEMPT),sourceSha:sha,treeSha:tree,
  entries:[...walk('.next/server'),...walk('.next/static')]});
 mkdirSync('release-evidence/p11',{recursive:true});
 writeFileSync('release-evidence/p11/build.json',JSON.stringify(record,null,2)+'\n',{mode:0o600});
 console.log('P11 '+record.worker+' compiled '+record.executable.files.length+
  ' selected outputs on independent CI worker; no deployable release image');
}
