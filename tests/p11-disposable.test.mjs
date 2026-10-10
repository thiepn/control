import test from 'node:test';import assert from 'node:assert/strict';
import {qualifyDisposableRecovery} from '../src/lib/p11-disposable.mjs';
const head='a'.repeat(40),host='abcdefghijklmnop.supabase.co',origin='https://'+host;
const env={CONTROL_P11_APPROVED_SOURCE_SHA:head,CONTROL_P11_OPERATOR_SCOPE:'READ_ONLY_PRECHECK_DISPOSABLE',
 CONTROL_P11_RETENTION_ACK:'REVIEWED_DISPOSABLE_ONLY',CONTROL_P11_DRY_RUN_ONLY:'NO_MUTATIONS',
 CONTROL_P11_APPROVAL_ID:'synthetic-approval',CONTROL_P11_APPROVED_AT:'2026-10-10T10:00:00.000Z',
 CONTROL_P9_APPROVED_SOURCE_HEAD:head,CONTROL_P9_OPERATOR_SCOPE:'DISPOSABLE_STAGING_ONLY',
 CONTROL_P9_APPROVED_STAGING_ORIGIN:origin,CONTROL_TEST_DISPOSABLE:'I_ACKNOWLEDGE_DISPOSABLE_PROJECT',
 CONTROL_P7_OPERATOR_SCOPE:'DISPOSABLE_ONLY',CONTROL_TEST_SUPABASE_URL:origin+'/',
 CONTROL_P7_APPROVED_STAGING_HOST:host,CONTROL_P7_TEST_PROJECT_REF:'abcdefghijklmnop',
 CONTROL_P7_DENIED_PRODUCTION_HOSTS:'production.supabase.co',
 CONTROL_TEST_PUBLISHABLE_KEY:'fake',CONTROL_TEST_SERVICE_KEY:'fake',
 CONTROL_P6_USER_A_STORAGE:'/a',CONTROL_P6_USER_B_STORAGE:'/b'};
const read=p=>({'/a':JSON.stringify({cookies:[{name:'a'}],origins:[]}),
 '/b':JSON.stringify({cookies:[{name:'b'}],origins:[]})})[p];
const now='2026-10-10T10:30:00.000Z';
test('staging approval preflight remains read-only and cannot imply real Supabase restore',()=>{
 const r=qualifyDisposableRecovery({env,sourceSha:head,now,read});
 assert.equal(r.realRestorePerformed,false);assert.equal(r.releaseAuthorized,false);
});
test('expired approval, wrong SHA, production scope and reused accounts fail closed',()=>{
 for(const e of [
  {...env,CONTROL_P11_APPROVED_AT:'2026-10-10T08:00:00.000Z'},
  {...env,CONTROL_P11_APPROVED_SOURCE_SHA:'b'.repeat(40)},
  {...env,CONTROL_P11_OPERATOR_SCOPE:'PRODUCTION'},
  {...env,CONTROL_P11_DRY_RUN_ONLY:'APPLY'},
  {...env,CONTROL_P6_USER_B_STORAGE:'/a'},
  {...env,CONTROL_P7_DENIED_PRODUCTION_HOSTS:''}
 ])assert.throws(()=>qualifyDisposableRecovery({env:e,sourceSha:head,now,read}));
});
