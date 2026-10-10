// Run from exact reviewed checkout. Does not deploy or publish generated assets.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,lstatSync,readdirSync} from 'node:fs';
import {join,relative} from 'node:path';
import {makeExecutableManifest,compareExecutableManifests,binaryDigest} from '../src/lib/p10-binary.mjs';
const root='.next';
function walk(dir,out=[]){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  const p=join(dir,entry.name);
  if(entry.isSymbolicLink())throw Error('Symlinked build output prohibited: '+p);
  if(entry.isDirectory())walk(p,out);
  else if(entry.isFile()&&/\.(js|mjs|css|wasm)$/.test(entry.name))
   out.push({path:p.split('\\').join('/'),sha256:binaryDigest(readFileSync(p))});
  else if(!entry.isFile())throw Error('Nonregular build artifact '+p);
 }
 return out;
}
function emit(){
 const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim();
 if(!process.env.CONTROL_P10_EXPECTED_HEAD||sha!==process.env.CONTROL_P10_EXPECTED_HEAD)
  throw Error('Expected exact P10 checkout required');
 return makeExecutableManifest({sourceSha:sha,treeSha:tree,
  entries:[...walk(join(root,'server')),...walk(join(root,'static'))]});
}
if(process.argv[1]?.endsWith('p10-binary-replay.mjs')){
 const mode=process.argv[2],path='release-evidence/p10/binary-first.json';
 if(mode==='capture'){
  mkdirSync('release-evidence/p10',{recursive:true});
  writeFileSync(path,JSON.stringify(emit(),null,2)+'\n',{mode:0o600});
  console.log('Captured first selected emitted-client/server executable manifest');
 }else if(mode==='compare'){
  const first=JSON.parse(readFileSync(path,'utf8'));
  const outcome=compareExecutableManifests(first,emit());
  writeFileSync('release-evidence/p10/binary-comparison.json',
   JSON.stringify({schema:'control-p10-binary-comparison-v1',
    source_sha:first.source_sha,first_build_sha256:outcome.sha256,
    second_build_sha256:outcome.sha256,files_compared:outcome.count,
    matched:true,release_authorized:false,deployed:false,
    limitation:'Selected emitted JS/CSS/WASM across two isolated clean builds; no full production image'},null,2)+'\n',
   {mode:0o600});
  console.log('Reproduced '+outcome.count+' selected emitted executables; no release authorization');
 }else throw Error('Expected capture or compare');
}
