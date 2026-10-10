import test from 'node:test';import assert from 'node:assert/strict';
import {makeP8Manifest,verifyP8Manifest} from '../scripts/p8-rehearsal.mjs';
const head='a'.repeat(40),read=path=>Buffer.from('synthetic '+path);
test('P8 source-only rehearsal checks exact head, inputs and nonapproval',()=>{
 const m=makeP8Manifest(head,'2026-10-10T00:00:00Z',read);
 assert.equal(verifyP8Manifest(m,head,read),true);
 assert.equal(m.release_authorized,false);assert.equal(m.operator_signature,'NOT_COLLECTED');
 assert.equal(m.isolated_rollback.databaseBackedUp,false);
 assert.throws(()=>verifyP8Manifest(m,'b'.repeat(40),read));
 const changed=structuredClone(m);changed.input_hashes[0].sha256='f'.repeat(64);
 assert.throws(()=>verifyP8Manifest(changed,head,read));
 const altered=structuredClone(m);altered.isolated_rollback.restoredExactly=false;
 assert.throws(()=>verifyP8Manifest(altered,head,read));
});
