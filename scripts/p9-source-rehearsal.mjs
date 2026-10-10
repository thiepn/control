// Exact-head tracked-source evidence, entirely read-only aside from local output files.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {makeSourceManifest,verifySourceManifest,fileDigest} from '../src/lib/p9-source.mjs';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
export function trackedSnapshot(){
 for(const args of [['diff','--quiet'],['diff','--cached','--quiet']]){
  try{execFileSync('git',args,{stdio:'ignore'});}
  catch{throw Error('Tracked source dirty: refuse to certify checkout');}
 }
 return execFileSync('git',['ls-files','-z']).toString('utf8')
  .split('\0').filter(Boolean).map(path=>{
   if(!lstatSync(path).isFile())throw Error('Nonregular tracked source: '+path);
   return {path,sha256:fileDigest(readFileSync(path))};
  });
}
export function exactSource(){
 const sourceSha=git('rev-parse','HEAD'),treeSha=git('rev-parse','HEAD^{tree}');
 if(!process.env.CONTROL_P9_EXPECTED_HEAD||
  process.env.CONTROL_P9_EXPECTED_HEAD!==sourceSha)
  throw Error('P9 exact branch-head attestation absent or mismatched');
 return {sourceSha,treeSha,entries:trackedSnapshot()};
}
const dir='release-evidence/p9';
if(process.argv[1]?.endsWith('p9-source-rehearsal.mjs')){
 const {sourceSha,treeSha,entries}=exactSource();
 if(process.argv[2]==='create'){
  const output=JSON.stringify(makeSourceManifest(sourceSha,treeSha,entries),null,2)+'\n';
  mkdirSync(dir,{recursive:true});
  writeFileSync(join(dir,'manifest.json'),output,{mode:0o600});
  writeFileSync(join(dir,'SHA256SUMS'),fileDigest(Buffer.from(output))+'  manifest.json\n',{mode:0o600});
  console.log('P9 complete tracked-source evidence created; no production operation');
 }else if(process.argv[2]==='verify'){
  verifySourceManifest(JSON.parse(readFileSync(join(dir,'manifest.json'),'utf8')),
   sourceSha,treeSha,entries);
  const wanted=fileDigest(readFileSync(join(dir,'manifest.json')))+'  manifest.json\n';
  if(readFileSync(join(dir,'SHA256SUMS'),'utf8')!==wanted)
   throw Error('P9 checksum mismatch');
  console.log('P9 verified exact HEAD and '+entries.length+' tracked source inputs');
 }else throw Error('Use create or verify');
}
