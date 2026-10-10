import test from 'node:test';import assert from 'node:assert/strict';
import {sign} from 'node:crypto';
import {syntheticTrustFixture} from './p11-trust.test.mjs';
import {canonicalEvidence} from '../src/lib/p10-evidence.mjs';
import {auditOperatorPacket,defaultDeniedClosure} from '../src/lib/p11-intake.mjs';
const SHA='a'.repeat(40),ART='b'.repeat(64),now='2026-10-10T11:20:00.000Z';
function fixture(){
 const {trust,keyB}=syntheticTrustFixture();
 const record={schema:'control-p10-evidence-v1',gate:'two_user_auth',
 source_sha:SHA,artifact_sha256:ART,evidence_sha256:'c'.repeat(64),
 nonce:'d'.repeat(32),reviewer:'reviewer_b',classification:'independently_reviewed',
 status:'accepted_for_review',issued_at:'2026-10-10T11:12:00.000Z',
 expires_at:'2026-10-10T11:40:00.000Z'};
 const signature=sign(null,Buffer.from(canonicalEvidence(record)),keyB.privateKey).toString('base64');
 const packet={schema:'control-p11-operator-packet-v1',source_sha:SHA,
  artifact_sha256:ART,external_custody_anchor_sha256:trust.pinnedHeadSha256,
  classification:'external_metadata_only',records:[{record,signature}]};
 return {packet,trust,now};
}
test('externally signed synthetic reviewer can audit metadata but never confer physical approval',()=>{
 const r=auditOperatorPacket(fixture());
 assert.equal(r.packet_signature_count,1);assert.equal(r.missing_human_gates.length,6);
 assert.equal(r.operatorDecision,'DENY');assert.equal(r.realDeviceApproval,false);
 assert.equal(r.independentlyVerifiedHumanApproval,false);
});
test('old revoked signer, packet source substitution, false self-report, wrong head and replay fail',()=>{
 const f=fixture();
 for(const input of [
  {...f,packet:{...f.packet,external_custody_anchor_sha256:'e'.repeat(64)}},
  {...f,packet:{...f.packet,source_sha:'e'.repeat(40)}},
  {...f,packet:{...f.packet,records:[f.packet.records[0],f.packet.records[0]]}},
  {...f,packet:{...f.packet,records:[{...f.packet.records[0],
    record:{...f.packet.records[0].record,reviewer:'reviewer_a'}}]}},
  {...f,packet:{...f.packet,classification:'self_reported_unverified'}},
  {...f,now:'2026-10-10T12:00:00.000Z'}
 ])assert.throws(()=>auditOperatorPacket(input));
});
test('closure remains DENIED even if every synthetic prerequisite marked green',()=>{
 const r=defaultDeniedClosure({sourceSha:SHA,artifactSha:ART,
  sourceVerified:true,binaryVerified:true,syntheticRestoreVerified:true,externalTrustVerified:true});
 assert.equal(r.status,'DENIED');assert.equal(r.release_authorized,false);
 assert.equal(r.human_signoff,'NOT_COLLECTED');
 assert.deepEqual(r.open_gates.slice(-2),['real_disposable_supabase_restore','separate_manual_release_authorization']);
 assert.throws(()=>defaultDeniedClosure({sourceSha:'invalid',artifactSha:ART}));
});
