import test from 'node:test';import assert from 'node:assert/strict';
import {makeExecutableManifest,compareExecutableManifests,binaryDigest} from '../src/lib/p10-binary.mjs';
const params={sourceSha:'a'.repeat(40),treeSha:'b'.repeat(40),entries:[
 {path:'.next/static/chunks/app.js',sha256:binaryDigest('chunk')},
 {path:'.next/server/app/page.js',sha256:binaryDigest('page')}]};
test('two exact executable build reports match; no deployment permitted',()=>{
 const a=makeExecutableManifest(params),b=makeExecutableManifest({...params,entries:[...params.entries].reverse()});
 const result=compareExecutableManifests(a,b);
 assert.equal(result.matched,true);assert.equal(result.releaseAuthorized,false);
});
test('compiled output mutation, missing server, forged approval, unexpected paths fail closed',()=>{
 const a=makeExecutableManifest(params);
 for(const b of [
  {...a,release_authorized:true},
  makeExecutableManifest({...params,entries:[params.entries[0],
   {...params.entries[1],sha256:binaryDigest('changed')}]}),
  {...a,source_sha:'c'.repeat(40)}
 ])assert.throws(()=>compareExecutableManifests(a,b));
 assert.throws(()=>makeExecutableManifest({...params,entries:[params.entries[0]]}));
 assert.throws(()=>makeExecutableManifest({...params,entries:[...params.entries,{path:'.next/../../secret',sha256:binaryDigest('x')}]}));
});
