import test from 'node:test';import assert from 'node:assert/strict';
import {validateStaging} from '../src/lib/p7-staging.mjs';
const host='abcdefghijklmnop.supabase.co',ref='abcdefghijklmnop';
const env={CONTROL_TEST_DISPOSABLE:'I_ACKNOWLEDGE_DISPOSABLE_PROJECT',
 CONTROL_P7_OPERATOR_SCOPE:'DISPOSABLE_ONLY',CONTROL_TEST_SUPABASE_URL:'https://'+host+'/',
 CONTROL_P7_APPROVED_STAGING_HOST:host,CONTROL_P7_TEST_PROJECT_REF:ref,
 CONTROL_TEST_PUBLISHABLE_KEY:'fake-test-only',CONTROL_TEST_SERVICE_KEY:'fake-test-only',
 CONTROL_P6_USER_A_STORAGE:'/a',CONTROL_P6_USER_B_STORAGE:'/b'};
const states={'/a':JSON.stringify({cookies:[{name:'session-a'}],origins:[]}),
 '/b':JSON.stringify({cookies:[{name:'session-b'}],origins:[]})};
const load=p=>{if(!(p in states))throw Error('Missing');return states[p];};
test('offline disposable staging preflight never claims real Auth or deployment',()=>{
 const r=validateStaging(env,load);
 assert.equal(r.approvedForLocalAcceptance,true);
 assert.equal(r.releaseAuthorized,false);assert.equal(r.realUserIdentityVerified,false);
});
test('rejects wrong host, production denylist, reused sessions and missing scope',()=>{
 assert.throws(()=>validateStaging({...env,CONTROL_P7_APPROVED_STAGING_HOST:'other.supabase.co'},load));
 assert.throws(()=>validateStaging({...env,CONTROL_P7_DENIED_PRODUCTION_HOSTS:host},load));
 assert.throws(()=>validateStaging({...env,CONTROL_P6_USER_B_STORAGE:'/a'},load));
 assert.throws(()=>validateStaging({...env,CONTROL_P7_OPERATOR_SCOPE:'PRODUCTION'},load));
 assert.throws(()=>validateStaging({...env,CONTROL_TEST_SUPABASE_URL:'https://'+host+'/rest/v1'},load));
});
test('cookie states containing identical identity evidence cannot pass',()=>{
 assert.throws(()=>validateStaging(env,()=>states['/a']));
});
