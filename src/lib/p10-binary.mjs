// Compare emitted executable files across separate CI builds. Not complete Docker/binary reproducibility.
import {createHash} from 'node:crypto';
const H=/^[0-9a-f]{64}$/,S=/^[0-9a-f]{40}$/;
export const binaryDigest=b=>createHash('sha256').update(b).digest('hex');
export function makeExecutableManifest({sourceSha,treeSha,entries}){
 if(!S.test(sourceSha||'')||!S.test(treeSha||'')
  ||!Array.isArray(entries)||!entries.length)throw Error('Exact compiled source identity required');
 const files=[...entries].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 let server=0,staticCount=0;
 for(let i=0;i<files.length;i++){
  const {path,sha256}=files[i]||{};
  if(typeof path!=='string'||!path.startsWith('.next/')
   ||path.includes('\\')||path.split('/').some(x=>!x||x==='.'||x==='..')
   ||!H.test(sha256||'')||(i>0&&files[i-1].path===path))
   throw Error('Invalid, duplicate or unsafe compiled path');
  if(path.startsWith('.next/static/'))staticCount++;
  else if(path.startsWith('.next/server/'))server++;
  else throw Error('Non-executable build file scope rejected');
 }
 if(!server||!staticCount)throw Error('Both emitted server and client executables required');
 return {schema:'control-p10-emitted-build-v1',source_sha:sourceSha,tree_sha:treeSha,
  files,sha256:binaryDigest(JSON.stringify(files)),server_files:server,static_files:staticCount,
  scope:'selected_emitted_js_css_wasm_only',
  release_authorized:false,deployed:false,
  note:'Two same-run independent builds are checked; not full deployment image reproducibility'};
}
export function compareExecutableManifests(first,second){
 if(!first||!second||JSON.stringify(first)!==JSON.stringify(second)
  ||first.release_authorized!==false||second.release_authorized!==false
  ||first.schema!=='control-p10-emitted-build-v1'){
  const a=new Map((first?.files||[]).map(x=>[x.path,x.sha256]));
  const b=new Map((second?.files||[]).map(x=>[x.path,x.sha256]));
  const differences=[...new Set([...a.keys(),...b.keys()])].sort().filter(x=>a.get(x)!==b.get(x));
  throw Error('Executable outputs differ, source was swapped or approval forged. Different paths: '
   +JSON.stringify(differences.slice(0,12))+'; changed file count='+differences.length);
 }
 return {matched:true,sha256:first.sha256,count:first.files.length,
  releaseAuthorized:false,deploymentAuthorized:false};
}
