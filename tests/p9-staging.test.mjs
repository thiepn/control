import test from 'node:test';import assert from 'node:assert/strict';
import {qualifyP9Staging} from '../scripts/p9-staging-preflight.mjs';
const head='a'.repeat(40),host='abcdefghijklmnop.supabase.co',origin='https://'+host;
const e={CONTROL_P9_APPROVED_SOURCE_HEAD:head,CONTROL_P9_OPERATOR_SCOPE:'DISPOSABLE_STAGING_ONLY',
 CONTROL_P9_APPROVED_STAGING_ORIGIN:origin,
 CONTROL_TEST_DISPOSABLE:'I_ACKNOWLEDGE_DISPOSABLE_PROJECT',CONTROL_P7_OPERATOR_SCOPE:'DISPOSABLE_ONLY',
 CONTROL_TEST_SUPABASE_URL:origin+'/',CONTROL_P7_APPROVED_STAGING_HOST:host,
 CONTROL_P7_TEST_PROJECT_REF:'abcdefghijklmnop',CONTROL_P7_DENIED_PRODUCTION_HOSTS:'production.supabase.co',
 CONTROL_TEST_PUBLISHABLE_KEY:'fake',CONTROL_TEST_SERVICE_KEY:'fake',
 CONTROL_P6_USER_A_STORAGE:'/a',CONTROL_P6_USER_B_STORAGE:'/b'};
const states={'/a':JSON.stringify({cookies:[{name:'a'}],origins:[]}),
 '/b':JSON.stringify({cookies:[{name:'b'}],origins:[]})};
const read=p=>states[p];
test('P9 configuration guard is nonreleasing and discloses no verified identity',()=>{
 const result=qualifyP9Staging(e,head,read);
 assert.equal(result.p9Gate,'configuration_only');
 assert.equal(result.realUserIdentityVerified,false);
 assert.equal(result.deploymentAuthorized,false);
});
test('unknown source, alternate host, absent denylist, reused states and production scope fail closed',()=>{
 for(const changes of [
  {CONTROL_P9_APPROVED_SOURCE_HEAD:'b'.repeat(40)},
  {CONTROL_P9_APPROVED_STAGING_ORIGIN:'https://different.supabase.co'},
  {CONTROL_P7_DENIED_PRODUCTION_HOSTS:''},
  {CONTROL_P6_USER_B_STORAGE:'/a'},
  {CONTROL_P9_OPERATOR_SCOPE:'PRODUCTION'}
 ])assert.throws(()=>qualifyP9Staging({...e,...changes},head,read));
});
