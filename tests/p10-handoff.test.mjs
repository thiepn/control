import test from 'node:test';import assert from 'node:assert/strict';
import {offlineAcceptanceHandoff} from '../scripts/p10-acceptance-handoff.mjs';
const args={sourceSha:'a'.repeat(40),artifactSha:'b'.repeat(64),now:'2026-10-10T12:00:00.000Z'};
test('no evidence produces default denied release handoff with all 7 human gates open',()=>{
 const x=offlineAcceptanceHandoff(args);
 assert.equal(x.release_authorized,false);assert.equal(x.operator_decision,'DENY');
 assert.equal(x.missing_gates.length,12);
 assert.equal(x.reviewed_gate_count,0);
});
test('even synthetic green source/custody/build/restore never authorizes deployment',()=>{
 const x=offlineAcceptanceHandoff({...args,custodyVerified:true,sourceVerified:true,
  binaryVerified:true,isolatedRestoreVerified:true});
 assert.equal(x.operator_decision,'DENY');assert.equal(x.missing_gates.length,8);
});
