import test from 'node:test';import assert from 'node:assert/strict';
import {defaultDeniedP15} from '../src/lib/p15-closure.mjs';
import {reconcileP15ReviewPreparation,reconcileP15ExternalImagePreparation} from '../src/lib/p15-acceptance.mjs';
const source='a'.repeat(40),artifact='b'.repeat(64);
test('P15 release freeze always keeps all 28 genuine external requirements OPEN',()=>{
 const r=defaultDeniedP15({sourceSha:source,artifactSha:artifact});
 assert.equal(r.decision,'DENY');assert.equal(r.freeze_state,'HOLD');
 assert.equal(r.missing.length,28);assert.equal(r.release_authorized,false);
 assert.equal(r.postrelease_authorized,false);assert.equal(r.rollback_authorized,false);
 assert.equal(r.actual_consent,'NOT_COLLECTED');assert.equal(r.physical_devices,'NOT_COLLECTED');
});
test('cannot claim physical review without independently pinned external human documents',()=>{
 assert.throws(()=>reconcileP15ReviewPreparation({
  handoffContext:{records:[]},consentContext:{entries:[]},
  independentlyPinnedSourceSha:source,independentlyPinnedArtifactSha256:artifact,
  independentlyPinnedHandoffHead:'c'.repeat(64),independentlyPinnedConsentHead:'d'.repeat(64),
  now:'2026-10-10T11:20:00.000Z'
 }));
});
test('production image attestation refuses missing outside-organization evidence',()=>{
 assert.throws(()=>reconcileP15ExternalImagePreparation({
  buildContext:{attestations:[]},independentlyPinnedSourceSha:source,
  independentlyPinnedTreeSha:source,independentlyPinnedExecutableSha256:'c'.repeat(64),
  independentlyPinnedImageSha256:'d'.repeat(64)
 }));
});
