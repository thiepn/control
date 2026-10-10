// Public exact-head CI handoff: only synthetic source and external unmet flags; always DENY.
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {defaultDeniedP13} from '../src/lib/p13-recovery.mjs';
if(process.argv[1]?.endsWith('p13-source-denial.mjs')){
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(head!==process.env.CONTROL_P13_EXPECTED_HEAD)throw Error('Wrong exact P13 source head');
 if(process.env.CI==='true'&&Object.keys(process.env).some(k=>k.startsWith('P13_PRIVATE_')))
  throw Error('No private operator, human or device evidence in CI');
 const decision=defaultDeniedP13({sourceSha:head,artifactSha:'0'.repeat(64)});
 if(decision.decision!=='DENY'||decision.missing.length!==18
  ||decision.release_authorized!==false)throw Error('P13 denial invariant broken');
 mkdirSync('release-evidence/p13',{recursive:true});
 writeFileSync('release-evidence/p13/closure.json',JSON.stringify(decision,null,2)+'\n',{mode:0o600});
 console.log('P13 exact-head off-Git handoff preparation: DENIED; 18 real-world requirements OPEN');
}
