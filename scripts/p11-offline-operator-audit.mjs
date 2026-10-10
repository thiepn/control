// Only explicitly authorized external OFF-REPO files; never read in CI or upload contents.
import {realpathSync,lstatSync,readFileSync} from 'node:fs';
import {relative,isAbsolute,resolve} from 'node:path';
import {auditOperatorPacket} from '../src/lib/p11-intake.mjs';
export function outsidePublicRepo(path,root=process.cwd()){
 if(!isAbsolute(path||'')||lstatSync(path).isSymbolicLink())throw Error('External nonsymlink absolute file required');
 const file=realpathSync(path),rel=relative(realpathSync(root),file);
 if(!rel||(!rel.startsWith('..')&&!isAbsolute(rel)))throw Error('Private packet belongs outside public Git');
 if(!lstatSync(file).isFile())throw Error('Regular private file required');
 return file;
}
if(process.argv[1]?.endsWith('p11-offline-operator-audit.mjs')){
 if(process.env.CI==='true')throw Error('Never read independently held operator evidence in public CI');
 const env=process.env;
 if(!env.P11_PRIVATE_PACKET_FILE||!env.P11_PRIVATE_TRUST_FILE)
  throw Error('Explicit private operator packet and independently pinned trust files required');
 const packet=JSON.parse(readFileSync(outsidePublicRepo(env.P11_PRIVATE_PACKET_FILE),'utf8'));
 const trust=JSON.parse(readFileSync(outsidePublicRepo(env.P11_PRIVATE_TRUST_FILE),'utf8'));
 const result=auditOperatorPacket({packet,trust,now:new Date().toISOString()});
 console.log('Offline independent packet cryptographic metadata inspected; signature count '+
  result.packet_signature_count+'. Production release DENIED, human/device acceptance uncollected.');
}
