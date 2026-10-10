// Public CI emits only an unsigned exact-source default-denied release freeze. No private packets.
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {defaultDeniedP15} from '../src/lib/p15-closure.mjs';
if(process.argv[1]?.endsWith('p15-source-denial.mjs')){
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(head!==process.env.CONTROL_P15_EXPECTED_HEAD)throw Error('P15 exact source checkout required');
 if(process.env.CI==='true'&&Object.keys(process.env).some(k=>k.startsWith('P15_PRIVATE_')))
  throw Error('Real consent and rights records cannot enter public CI');
 const record=defaultDeniedP15({sourceSha:head,artifactSha:'0'.repeat(64)});
 if(record.decision!=='DENY'||record.freeze_state!=='HOLD'
  ||record.missing.length!==28||record.release_authorized!==false
  ||record.rollback_authorized!==false||record.postrelease_authorized!==false)
  throw Error('P15 default-denied freeze invariant broken');
 mkdirSync('release-evidence/p15',{recursive:true});
 writeFileSync('release-evidence/p15/closure.json',JSON.stringify(record,null,2)+'\n',{mode:0o600});
 console.log('P15 exact-head DENY/HOLD: 28 genuine external acceptance prerequisites OPEN');
}
