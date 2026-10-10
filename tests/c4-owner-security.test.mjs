import test from 'node:test';
import assert from 'node:assert/strict';
import {controlOwnerAllowed,controlOwnerConfigured} from '../src/lib/control-owner.mjs';
const alpha='11111111-1111-4111-8111-111111111111',beta='22222222-2222-4222-8222-222222222222';
test('private owner configuration fails closed before an owner is configured',()=>{
 for(const value of ['',',', 'missing','not-a-uuid',alpha+',invalid',alpha+','+alpha])
  assert.equal(controlOwnerConfigured(value),false,value);
 assert.equal(controlOwnerAllowed(alpha,''),false);
 assert.equal(controlOwnerAllowed(null,alpha),false);
});
test('only explicitly configured Supabase Auth UUIDs are allowed, not arbitrary signed-in users',()=>{
 assert.equal(controlOwnerConfigured(alpha),true);
 assert.equal(controlOwnerAllowed(alpha,alpha),true);
 assert.equal(controlOwnerAllowed(beta,alpha),false);
 assert.equal(controlOwnerAllowed(beta,alpha+','+beta),true);
 assert.equal(controlOwnerAllowed(alpha.toUpperCase(),alpha),true);
 assert.equal(controlOwnerAllowed('invalid',alpha),false);
});
