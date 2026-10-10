// Public CI must never import private operator packets or generate human acceptance.
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {defaultDeniedClosure} from '../src/lib/p11-intake.mjs';
if(process.argv[1]?.endsWith('p11-default-denial.mjs')){
 const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(process.env.CONTROL_P11_EXPECTED_HEAD!==sha)throw Error('Exact source checkout required');
 if(process.env.CI==='true'&&Object.keys(process.env).some(k=>k.startsWith('P11_PRIVATE_')))
  throw Error('Private external acceptance must never be imported into public CI');
 const record=defaultDeniedClosure({sourceSha:sha,artifactSha:'0'.repeat(64)});
 mkdirSync('release-evidence/p11',{recursive:true});
 writeFileSync('release-evidence/p11/default-denial.json',JSON.stringify(record,null,2)+'\n',
  {mode:0o600});
 if(record.status!=='DENIED'||record.release_authorized!==false
  ||record.open_gates.length!==13)throw Error('Default-denied closure invariant violated');
 console.log('P11 exact-head synthetic release remains DENIED, '+record.open_gates.length+
  ' prerequisites open; no external approval');
}
