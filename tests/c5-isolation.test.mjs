import test from 'node:test';
import assert from 'node:assert/strict';
import {ownerSessionChanged} from '../src/lib/control-session.mjs';
import {focusDraftKey,focusDraftValue,clearFocusDraft} from '../src/lib/focus-drafts.mjs';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
test('cross-tab signed-out and switched-identity events invalidate rendered owner state',()=>{
 assert.equal(ownerSessionChanged('SIGNED_OUT',null,a),true);
 assert.equal(ownerSessionChanged('SIGNED_OUT',a,a),true);
 assert.equal(ownerSessionChanged('SIGNED_IN',b,a),true);
 assert.equal(ownerSessionChanged('TOKEN_REFRESHED',b,a),true);
 assert.equal(ownerSessionChanged('USER_UPDATED',b,a),true);
});
test('initial hydration or same owner token refresh never prematurely removes owner dashboard',()=>{
 assert.equal(ownerSessionChanged('INITIAL_SESSION',null,a),false);
 assert.equal(ownerSessionChanged('INITIAL_SESSION',a,a),false);
 assert.equal(ownerSessionChanged('TOKEN_REFRESHED',a,a),false);
 assert.equal(ownerSessionChanged('SIGNED_IN',a,a),false);
});
test('weekly objectives have independent drafts for project/week and allow clearing edits',()=>{
 const d={};
 d[focusDraftKey('one','2026-10-05')]='First week update';
 d[focusDraftKey('one','2026-10-12')]='Second week update';
 d[focusDraftKey('two','2026-10-05')]='Another project';
 assert.equal(focusDraftValue(d,'one','2026-10-05','Persisted 1'),'First week update');
 assert.equal(focusDraftValue(d,'one','2026-10-12','Persisted 2'),'Second week update');
 assert.equal(focusDraftValue(d,'two','2026-10-05','Persisted 3'),'Another project');
 const cleared={...d,[focusDraftKey('one','2026-10-12')]:''};
 assert.equal(focusDraftValue(cleared,'one','2026-10-12','Persisted 2'),'');
 const saved=clearFocusDraft(cleared,'one','2026-10-05');
 assert.equal(focusDraftValue(saved,'one','2026-10-05','New database objective'),'New database objective');
 assert.equal(focusDraftValue(saved,'one','2026-10-12','Persisted 2'),'');
 assert.equal(focusDraftValue(saved,'two','2026-10-05','Persisted 3'),'Another project');
});
