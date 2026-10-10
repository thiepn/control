// CI-only denied source handoff; never reads externally held witness records.
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {defaultDeniedP14} from '../src/lib/p14-closure.mjs';
if(process.argv[1]?.endsWith('p14-source-denial.mjs')){
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(head!==process.env.CONTROL_P14_EXPECTED_HEAD)throw Error('Exact P14 source required');
 if(process.env.CI==='true'&&Object.keys(process.env).some(k=>k.startsWith('P14_PRIVATE_')))
  throw Error('Private reviewer/device evidence forbidden in public CI');
 const d=defaultDeniedP14({sourceSha:head,artifactSha:'0'.repeat(64)});
 if(d.decision!=='DENY'||d.missing.length!==22||d.release_authorized!==false
  ||d.precutover_authorized!==false||d.postrelease_authorized!==false)
  throw Error('P14 fail-closed invariant broken');
 mkdirSync('release-evidence/p14',{recursive:true});
 writeFileSync('release-evidence/p14/default-denial.json',
  JSON.stringify(d,null,2)+'\n',{mode:0o600});
 console.log('P14 release and postrelease decisions DENY; all 22 external requirements uncollected');
}
