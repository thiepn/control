// Public exact-head SHA ledger plus mandatory source-only release DENY. No private records in CI.
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {defaultDeniedP17} from '../src/lib/p17-closure.mjs';
if(process.argv[1]?.endsWith('p17-source-denial.mjs')){
 const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(source!==process.env.CONTROL_P17_EXPECTED_HEAD)
  throw Error('Exact committed source HEAD required');
 if(process.env.CI==='true'&&Object.keys(process.env).some(k=>k.startsWith('P17_PRIVATE_')))
  throw Error('Never submit real human rights/device records or signing keys to public CI');
 const r=defaultDeniedP17({sourceSha:source,artifactSha:'0'.repeat(64)});
 if(r.decision!=='DENY'||r.freeze_state!=='HOLD'||r.missing.length!==42
  ||r.release_authorized!==false||r.rollback_authorized!==false
  ||r.postrelease_authorized!==false||r.deployment_authorized!==false)
  throw Error('Production default-denial invariants violated');
 mkdirSync('release-evidence/p17',{recursive:true});
 writeFileSync('release-evidence/p17/closure.json',JSON.stringify(r,null,2)+'\n',{mode:0o600});
 console.log('P17 immutable source-bound DENY/HOLD: 42 real-world external prerequisites OPEN');
}
