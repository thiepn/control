import test from 'node:test';import assert from 'node:assert/strict';
import {canonicalP14Handoff,reconcileP14Handoff} from '../src/lib/p14-handoff.mjs';
import {defaultDeniedP14} from '../src/lib/p14-closure.mjs';
const source='a'.repeat(40),artifact='b'.repeat(64),pin='c'.repeat(64);
function receipt(surface,nonce){return {schema:'control-p14-handoff-v1',surface,
 source_sha:source,artifact_sha256:artifact,evidence_sha256:'d'.repeat(64),
 object_sha256:'e'.repeat(64),rights_sha256:'f'.repeat(64),
 custody_head_sha256:pin,nonce:nonce.toString(16).padStart(32,'0'),
 reviewer_role:'external_reviewer',request_id:'request_'+nonce,
 classification:'REVIEW_REQUEST_ONLY',scope:'OFF_REPO_METADATA_ONLY'};}
const args=records=>({records,expectedSourceSha:source,
 expectedArtifactSha:artifact,independentlyPinnedCustodyHeadSha256:pin});
test('nine review-only external requests can be described without collecting real evidence',()=>{
 const r=reconcileP14Handoff(args([receipt('android_chrome',1),receipt('nvda',2)]));
 assert.equal(r.requested,2);assert.equal(r.real_device_verified,false);
 assert.equal(r.actual_human_review_collected,false);assert.equal(r.rights_ownership_verified,false);
 assert.equal(r.release_authorized,false);assert.equal(r.request_digests.length,2);
});
test('replayed requests, substituted rights, self-declared approval and altered custody refuse',()=>{
 const a=receipt('android_chrome',1),b=receipt('nvda',2);
 for(const v of [
  args([a,a]),args([a,{...b,nonce:a.nonce}]),
  args([a,{...b,request_id:a.request_id}]),
  args([{...a,classification:'APPROVED'}]),
  args([{...a,rights_sha256:'invalid'}]),
  args([{...a,custody_head_sha256:'0'.repeat(64)}]),
  {...args([a]),expectedSourceSha:'0'.repeat(40)}
 ])assert.throws(()=>reconcileP14Handoff(v));
 assert.throws(()=>canonicalP14Handoff({...a,surface:'release_approved'}));
});
test('all 22 genuine external release prerequisites remain DENIED even with test records',()=>{
 const r=defaultDeniedP14({sourceSha:source,artifactSha:artifact});
 assert.equal(r.missing.length,22);assert.equal(r.decision,'DENY');
 assert.equal(r.precutover_authorized,false);assert.equal(r.postrelease_authorized,false);
 assert.equal(r.rollback_authorized,false);assert.equal(r.release_authorized,false);
});
