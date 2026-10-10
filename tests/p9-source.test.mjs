import test from 'node:test';import assert from 'node:assert/strict';
import {makeSourceManifest,verifySourceManifest,fileDigest} from '../src/lib/p9-source.mjs';
const head='a'.repeat(40),tree='b'.repeat(40),input=[
 {path:'src/a.mjs',sha256:fileDigest('alpha')},
 {path:'tests/b.mjs',sha256:fileDigest('bravo')}
];
test('sorted complete tracked-source manifest is deterministic and always nonreleasing',()=>{
 const a=makeSourceManifest(head,tree,input);
 assert.deepEqual(a,makeSourceManifest(head,tree,[...input].reverse()));
 assert.equal(verifySourceManifest(a,head,tree,input).verified,true);
 assert.equal(a.release_authorized,false);assert.equal(a.human_signoff,'NOT_COLLECTED');
});
test('missing file, swapped head/tree, tampered digests and forged authorizations fail',()=>{
 const a=makeSourceManifest(head,tree,input);
 for(const args of [
  [a,'c'.repeat(40),tree,input],
  [a,head,'c'.repeat(40),input],
  [a,head,tree,input.slice(1)],
  [{...a,release_authorized:true},head,tree,input],
  [{...a,real_backup_restore:'VERIFIED'},head,tree,input]
 ])assert.throws(()=>verifySourceManifest(...args));
 assert.throws(()=>makeSourceManifest(head,tree,[...input,input[0]]));
 assert.throws(()=>makeSourceManifest(head,tree,[{path:'../secret',sha256:fileDigest('x')}]));
});
