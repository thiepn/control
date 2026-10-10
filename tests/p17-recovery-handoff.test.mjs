import test from 'node:test';import assert from 'node:assert/strict';
import {defaultDeniedP17} from '../src/lib/p17-closure.mjs';
import {auditP17RecoveryHandoff} from '../src/lib/p17-recovery-handoff.mjs';
const source='a'.repeat(40),art='b'.repeat(64);
test('P17 external restoration and 42 actual human prerequisites are always denied',()=>{
 const r=defaultDeniedP17({sourceSha:source,artifactSha:art});
 assert.equal(r.schema,'control-p17-default-denial-v1');
 assert.equal(r.missing.length,42);assert.equal(r.release_authorized,false);
 assert.equal(r.rollback_authorized,false);assert.equal(r.deployment_authorized,false);
 assert.equal(r.freeze_state,'HOLD');assert.equal(r.human_acceptance,'NOT_COLLECTED');
});
test('real external project origin and independent two-user scoped permission are mandatory',()=>{
 const basics={expectedSourceSha:source,expectedArtifactSha:art,now:'2026-10-10T11:20:00.000Z',
  independentlyPinnedRecoveryGenesis:'0'.repeat(64),
  independentlyPinnedRecoveryHead:'1'.repeat(64),
  independentlyPinnedArchiveSha256:'2'.repeat(64),
  independentlyPinnedPriorStableSha256:'3'.repeat(64),
  recoveryClaimsContext:{records:[]},preflightContext:{env:{}}};
 assert.throws(()=>auditP17RecoveryHandoff(basics));
 assert.throws(()=>auditP17RecoveryHandoff({...basics,expectedSourceSha:'wrong'}));
 assert.throws(()=>auditP17RecoveryHandoff({...basics,independentlyPinnedArchiveSha256:'no pin'}));
});
