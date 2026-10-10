import test from 'node:test';import assert from 'node:assert/strict';
import {auditP16ReleaseIsolation,defaultDeniedP16} from '../src/lib/p16-authority.mjs';
const source='a'.repeat(40),artifact='b'.repeat(64);
test('P16 exact-source default-denied handoff preserves 34 open external release prerequisites',()=>{
 const r=defaultDeniedP16({sourceSha:source,artifactSha:artifact});
 assert.equal(r.missing.length,34);assert.equal(r.decision,'DENY');
 assert.equal(r.freeze_state,'HOLD');assert.equal(r.actual_human_consent,'NOT_COLLECTED');
 assert.equal(r.rollback_authorized,false);assert.equal(r.deployment_authorized,false);
 assert.equal(r.release_authorized,false);
});
test('untrusted source, executable, image and quarantine status cannot reach authority layer',()=>{
 const base={expectedSourceSha:source,expectedArtifactSha:artifact,
  independentlyPinnedConsentHead:'c'.repeat(64),independentlyPinnedImageSha256:'d'.repeat(64),
  independentlyPinnedTreeSha:'e'.repeat(40),independentlyPinnedExecutableSha256:'f'.repeat(64),
  quarantineStatus:'QUARANTINED',now:'2026-10-10T11:20:00.000Z',
  freezeContext:{},imageContext:{}};
 for(const x of [{...base,expectedSourceSha:'invalid'},
  {...base,independentlyPinnedTreeSha:'invalid'},
  {...base,quarantineStatus:'APPROVED'},{...base,imageContext:null}])
  assert.throws(()=>auditP16ReleaseIsolation(x));
});
