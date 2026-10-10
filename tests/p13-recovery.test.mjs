import test from 'node:test';import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {canonicalP13Decision} from '../src/lib/p13-decision-separation.mjs';
import {preflightP13Recovery,defaultDeniedP13} from '../src/lib/p13-recovery.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const head='a'.repeat(40),artifact='b'.repeat(64),host='abcdefghijklmnop.supabase.co';
const origin='https://'+host;
const alice=generateKeyPairSync('ed25519'),bob=generateKeyPairSync('ed25519');
const ownerPublicKeyPem=alice.publicKey.export({type:'spki',format:'pem'});
const auditorPublicKeyPem=bob.publicKey.export({type:'spki',format:'pem'});
const now='2026-10-10T10:30:00.000Z';
const env={CONTROL_P13_RECOVERY_MODE:'READ_ONLY_DISPOSABLE_PRECHECK',
 CONTROL_P13_APPROVED_SOURCE_SHA:head,CONTROL_P13_APPROVED_ARTIFACT_SHA256:artifact,
 CONTROL_P13_NO_WRITE_ACK:'NO_DATABASE_ACTIONS',
 CONTROL_P13_AUTH_SCOPE:'SEPARATE_A_B_TEST_SESSIONS',
 CONTROL_P11_APPROVED_SOURCE_SHA:head,CONTROL_P11_OPERATOR_SCOPE:'READ_ONLY_PRECHECK_DISPOSABLE',
 CONTROL_P11_RETENTION_ACK:'REVIEWED_DISPOSABLE_ONLY',CONTROL_P11_DRY_RUN_ONLY:'NO_MUTATIONS',
 CONTROL_P11_APPROVAL_ID:'synthetic-approval',CONTROL_P11_APPROVED_AT:'2026-10-10T10:00:00.000Z',
 CONTROL_P9_APPROVED_SOURCE_HEAD:head,CONTROL_P9_OPERATOR_SCOPE:'DISPOSABLE_STAGING_ONLY',
 CONTROL_P9_APPROVED_STAGING_ORIGIN:origin,
 CONTROL_TEST_DISPOSABLE:'I_ACKNOWLEDGE_DISPOSABLE_PROJECT',
 CONTROL_P7_OPERATOR_SCOPE:'DISPOSABLE_ONLY',CONTROL_TEST_SUPABASE_URL:origin+'/',
 CONTROL_P7_APPROVED_STAGING_HOST:host,CONTROL_P7_TEST_PROJECT_REF:'abcdefghijklmnop',
 CONTROL_P7_DENIED_PRODUCTION_HOSTS:'production.supabase.co',
 CONTROL_TEST_PUBLISHABLE_KEY:'fake',CONTROL_TEST_SERVICE_KEY:'fake',
 CONTROL_P6_USER_A_STORAGE:'/a',CONTROL_P6_USER_B_STORAGE:'/b'};
const read=p=>({'/a':JSON.stringify({cookies:[{name:'a'}],origins:[]}),
 '/b':JSON.stringify({cookies:[{name:'b'}],origins:[]})})[p];
function fixture(){
 const record={schema:'control-p13-owner-review-v1',source_sha:head,artifact_sha256:artifact,
  witness_head_sha256:'c'.repeat(64),trust_head_sha256:'d'.repeat(64),
  nonce:'1'.repeat(32),owner_id:'owner_test',auditor_id:'auditor_test',
  action:'REVIEW_ONLY_DENY',issued_at:'2026-10-10T10:20:00.000Z'};
 const canonical=canonicalP13Decision(record);
 const acknowledgment={record,owner_signature:sign(null,Buffer.from(canonical),alice.privateKey).toString('base64'),
  auditor_signature:sign(null,Buffer.from(canonical),bob.privateKey).toString('base64'),
  ownerPublicKeyPem,auditorPublicKeyPem,
  pinnedOwnerKeySha256:sha(ownerPublicKeyPem),pinnedAuditorKeySha256:sha(auditorPublicKeyPem),
  pinnedWitnessHeadSha256:'c'.repeat(64),pinnedTrustHeadSha256:'d'.repeat(64)};
 return {env,sourceSha:head,artifactSha:artifact,now,read,acknowledgment};
}
test('synthetic preflight passes but never executes Supabase or claims actual approval',()=>{
 const r=preflightP13Recovery(fixture());
 assert.equal(r.config_verified,true);assert.equal(r.real_restore_performed,false);
 assert.equal(r.genuine_two_user_auth_verified,false);assert.equal(r.release_authorized,false);
});
test('changed source, prod operation, expired authorization and forged reviewer reject',()=>{
 const f=fixture();
 for(const bad of [
  {...f,artifactSha:'f'.repeat(64)},
  {...f,env:{...f.env,CONTROL_P13_RECOVERY_MODE:'PRODUCTION_RESTORE'}},
  {...f,env:{...f.env,CONTROL_P13_NO_WRITE_ACK:'WRITE'}},
  {...f,env:{...f.env,CONTROL_P11_APPROVED_AT:'2026-10-10T08:00:00.000Z'}},
  {...f,acknowledgment:{...f.acknowledgment,auditor_signature:'A'.repeat(88)}},
  {...f,env:{...f.env,CONTROL_P6_USER_B_STORAGE:'/a'}}
 ])assert.throws(()=>preflightP13Recovery(bad));
});
test('P13 keeps all 18 release gates open regardless of synthetic signature exercises',()=>{
 const r=defaultDeniedP13({sourceSha:head,artifactSha:artifact});
 assert.equal(r.missing.length,18);assert.equal(r.decision,'DENY');
 assert.equal(r.release_authorized,false);assert.equal(r.human_signoff,'NOT_COLLECTED');
});
