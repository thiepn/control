import test from 'node:test';import assert from 'node:assert/strict';
import {sealWorkerManifest,compareIndependentWorkers} from '../src/lib/p11-independent-build.mjs';
import {binaryDigest} from '../src/lib/p10-binary.mjs';
const source='a'.repeat(40),tree='b'.repeat(40);
const entries=[{path:'.next/server/app.js',sha256:binaryDigest('same')},
 {path:'.next/static/client.js',sha256:binaryDigest('same client')}];
const mk=(worker,runnerName)=>sealWorkerManifest({worker,runnerName,runId:123,
 runAttempt:1,sourceSha:source,treeSha:tree,entries});
test('independent hosted job records enforce different runners, same complete executables',()=>{
 const r=compareIndependentWorkers(mk('alpha','Runner alpha'),mk('beta','Runner beta'),source);
 assert.equal(r.files_matched,true);assert.equal(r.files_compared,2);
 assert.equal(r.release_authorized,false);assert.equal(r.production_image_verified,false);
});
test('same runner, replay, changed SHA and altered binaries refuse strict cross-runner comparison',()=>{
 const a=mk('alpha','Runner alpha'),b=mk('beta','Runner beta');
 for(const alt of [
  {...b,runner_name:a.runner_name},
  {...b,workflow_run_id:124},
  {...b,worker:'alpha'},
  {...b,release_authorized:true},
  {...b,production_key_used:true},
  {...b,executable:{...b.executable,files:b.executable.files.map((x,i)=>i?x:{...x,sha256:binaryDigest('tamper')}}},
  {...b,executable:{...b.executable,source_sha:'c'.repeat(40)}}
 ])assert.throws(()=>compareIndependentWorkers(a,alt,source));
});
