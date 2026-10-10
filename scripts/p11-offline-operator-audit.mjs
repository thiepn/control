// Only explicitly authorized external OFF-REPO files; never read in CI or upload contents.
import {realpathSync,lstatSync,readFileSync} from 'node:fs';
import {relative,isAbsolute} from 'node:path';
import {execFileSync} from 'node:child_process';
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
 const expectedSourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(!env.P11_EXPECTED_SOURCE_SHA||env.P11_EXPECTED_SOURCE_SHA!==expectedSourceSha
  ||!env.P11_EXPECTED_ARTIFACT_SHA256
  ||!env.P11_PINNED_ROOT_SHA256||!env.P11_PINNED_GENESIS_SHA256||!env.P11_PINNED_HEAD_SHA256)
  throw Error('Independent operator-supplied source, artifact and trust pins are mandatory');
 // Never trust self-reported pins inside the same untrusted packet/trust file.
 const independentlyPinned={...trust,pinnedRootSha256:env.P11_PINNED_ROOT_SHA256,
  pinnedGenesisSha256:env.P11_PINNED_GENESIS_SHA256,
  pinnedHeadSha256:env.P11_PINNED_HEAD_SHA256};
 const result=auditOperatorPacket({packet,trust:independentlyPinned,
  expectedSourceSha,expectedArtifactSha:env.P11_EXPECTED_ARTIFACT_SHA256,
  now:new Date().toISOString()});
 console.log('Offline independent packet cryptographic metadata inspected; signature count '+
  result.packet_signature_count+'. Production release DENIED, human/device acceptance uncollected.');
}
