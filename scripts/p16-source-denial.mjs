// Public CI exact-head provenance and default-denied quarantine; never reads private evidence.
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {defaultDeniedP16} from '../src/lib/p16-authority.mjs';
if(process.argv[1]?.endsWith('p16-source-denial.mjs')){
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(head!==process.env.CONTROL_P16_EXPECTED_HEAD)throw Error('P16 exact Git head required');
 if(process.env.CI==='true'&&Object.keys(process.env).some(k=>k.startsWith('P16_PRIVATE_')))
  throw Error('Real consent/rights/devices/keys must never enter public CI');
 const r=defaultDeniedP16({sourceSha:head,artifactSha:'0'.repeat(64)});
 if(r.decision!=='DENY'||r.freeze_state!=='HOLD'||r.missing.length!==34
  ||r.release_authorized!==false||r.postrelease_authorized!==false
  ||r.rollback_authorized!==false||r.deployment_authorized!==false)
  throw Error('P16 external release quarantine no-go invariant violated');
 mkdirSync('release-evidence/p16',{recursive:true});
 writeFileSync('release-evidence/p16/closure.json',JSON.stringify(r,null,2)+'\n',{mode:0o600});
 console.log('P16 exact-head release DENY/HOLD; 34 independent human/service requirements OPEN');
}
