// Deterministic manifest over every tracked file, NOT a reproducible binary attestation.
import {createHash} from 'node:crypto';
const SHA=/^[a-f0-9]{40}$/,DIGEST=/^[a-f0-9]{64}$/;
export const fileDigest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function makeSourceManifest(sourceSha,treeSha,entries){
 if(!SHA.test(sourceSha||'')||!SHA.test(treeSha||'')
  ||!Array.isArray(entries)||!entries.length)throw Error('Exact source tree required');
 const files=[...entries].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 for(let i=0;i<files.length;i++){
  const p=files[i]?.path;
  if(typeof p!=='string'||!p||p.startsWith('/')||p.includes('\\')||p.includes('\0')
   ||p.split('/').some(s=>!s||s==='.'||s==='..')
   ||!DIGEST.test(files[i]?.sha256||'')||(i>0&&files[i-1].path===p))
   throw Error('Invalid, duplicate, or unsafe tracked source');
 }
 return {schema:'control-p9-source-rehearsal-v1',source_sha:sourceSha,tree_sha:treeSha,
  tracked_files:files,tracked_files_sha256:fileDigest(JSON.stringify(files)),
  source_file_count:files.length,release_authorized:false,deployed:false,
  actual_disposable_auth:'NOT_COLLECTED',physical_devices:'NOT_COLLECTED',
  screen_readers:'NOT_COLLECTED',human_signoff:'NOT_COLLECTED',
  independent_custody:'NOT_COLLECTED',real_backup_restore:'NOT_COLLECTED',
  note:'Complete tracked-source manifest only; no reproducible Next.js binary claim'};
}
export function verifySourceManifest(manifest,sourceSha,treeSha,entries){
 const expected=makeSourceManifest(sourceSha,treeSha,entries);
 if(!manifest||JSON.stringify(manifest)!==JSON.stringify(expected))
  throw Error('Source digest, identity or nonapproval state mismatch');
 return {verified:true,files:expected.source_file_count,releaseAuthorized:false};
}
