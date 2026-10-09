import test from 'node:test';import assert from 'node:assert/strict';
import {makeManifest,verifyManifest} from '../scripts/p7-rehearsal.mjs';
const head='c'.repeat(40);const read=path=>Buffer.from('fixture '+path);
test('P7 review-only manifest is bound to exact SHA and every source file',()=>{
 const m=makeManifest(head,'2026-10-10T00:00:00Z',read);
 assert.equal(verifyManifest(m,head,read),true);
 assert.equal(m.release_authorized,false);
 assert.equal(m.trusted_operator_signature,'NOT_COLLECTED');
 assert.throws(()=>verifyManifest(m,'d'.repeat(40),read));
 const swapped=structuredClone(m);swapped.inputs[1].sha256='0'.repeat(64);
 assert.throws(()=>verifyManifest(swapped,head,read));
 const enabled=structuredClone(m);enabled.release_authorized=true;
 assert.throws(()=>verifyManifest(enabled,head,read));
});
