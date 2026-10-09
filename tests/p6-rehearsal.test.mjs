import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEvidence} from '../scripts/p6-rehearsal.mjs';
test('source-bound rehearsal never fabricates user/device approval',()=>{
 const x=buildEvidence({commit:'a'.repeat(40),branch:'feat/p6-release-device-evidence',
  now:'2026-10-10T00:00:00Z',files:['package.json']});
 assert.equal(x.source.commit,'a'.repeat(40));
 assert.equal(x.inputs[0].sha256.length,64);
 assert.equal(x.acceptance.disposableTwoUserAuth,'NOT_COLLECTED');
 assert.equal(x.acceptance.physicalAndroid,'NOT_COLLECTED');
 assert.equal(x.acceptance.physicalIOS,'NOT_COLLECTED');
 assert.equal(x.acceptance.screenReader,'NOT_COLLECTED');
 assert.equal(x.acceptance.operatorApproval,'NOT_SIGNED');
 assert.equal(x.release.deployed,false);assert.equal(x.release.authorized,false);
});
test('release evidence rejects invalid exact SHA',()=>{
 assert.throws(()=>buildEvidence({commit:'not-a-sha',branch:'x',now:'y',files:[]}));
});
