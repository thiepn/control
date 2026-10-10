import test from 'node:test';import assert from 'node:assert/strict';
import {canonicalP17Candidate} from '../src/lib/p17-candidate.mjs';
import {canonicalP17Original} from '../src/lib/p17-governance.mjs';
import {canonicalP17Rotation} from '../src/lib/p17-rotation.mjs';
test('untrusted handwritten claims never accept approval, deployment or unsigned source',()=>{
 const source='a'.repeat(40),a='b'.repeat(64);
 assert.throws(()=>canonicalP17Candidate({
  schema:'control-p17-frozen-candidate-v1',source_sha:source,state:'APPROVED',cutover:'APPROVE'}));
 assert.throws(()=>canonicalP17Original({schema:'control-p17-original-witness-v1',
  kind:'android_chrome',source_sha:source,classification:'PHYSICALLY_APPROVED'}));
 assert.throws(()=>canonicalP17Rotation({schema:'control-p17-custodian-rotation-v1',
  kind:'candidate_replacement',source_sha:source,artifact_sha256:a,disposition:'TRUSTED'}));
});
