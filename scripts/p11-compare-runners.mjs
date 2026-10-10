// Separate verification job, rehash downloaded manifests from independent GitHub job artifacts.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {compareIndependentWorkers} from '../src/lib/p11-independent-build.mjs';
if(process.argv[1]?.endsWith('p11-compare-runners.mjs')){
 const e=process.env;
 const source=e.CONTROL_P11_EXPECTED_HEAD;
 if(e.CI!=='true'||!source)throw Error('Exact CI source required');
 const a=JSON.parse(readFileSync('release-evidence/p11/alpha/build.json','utf8'));
 const b=JSON.parse(readFileSync('release-evidence/p11/beta/build.json','utf8'));
 const proof=compareIndependentWorkers(a,b,source);
 mkdirSync('release-evidence/p11/verified',{recursive:true});
 writeFileSync('release-evidence/p11/verified/comparison.json',
  JSON.stringify(proof,null,2)+'\n',{mode:0o600});
 console.log('Independent GitHub worker provenance verified: '+proof.files_compared+
  ' emitted binaries byte-identical. NOT a production release authorization.');
}
