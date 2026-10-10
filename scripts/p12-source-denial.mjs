// Public CI writes only explicit default denial. Never loads human records or production credentials.
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {defaultDeniedP12} from '../src/lib/p12-witness.mjs';
if(process.argv[1]?.endsWith('p12-source-denial.mjs')){
 const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(sha!==process.env.CONTROL_P12_EXPECTED_HEAD)throw Error('P12 exact-head checkout required');
 if(process.env.CI==='true'&&Object.keys(process.env).some(x=>x.startsWith('P12_PRIVATE_')))
  throw Error('Private physical/human evidence must not be supplied to public CI');
 const result=defaultDeniedP12({sourceSha:sha,artifactSha:'0'.repeat(64)});
 if(result.decision!=='DENY'||result.missing.length!==16||result.release_authorized!==false)
  throw Error('P12 nonrelease invariant failed');
 mkdirSync('release-evidence/p12',{recursive:true});
 writeFileSync('release-evidence/p12/closure.json',JSON.stringify(result,null,2)+'\n',{mode:0o600});
 console.log('P12 offline handoff denied with 16 genuine release prerequisites uncollected');
}
