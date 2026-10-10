import test from 'node:test';import assert from 'node:assert/strict';
import {simulateRollback} from '../src/lib/p8-rollback.mjs';
const seed={projects:[{id:'a',version:1,next_action:'old'},{id:'b',version:3,next_action:'none'}],
 reviews:[{id:'r',state:'submitted',wins:'Synthetic text'}]};
test('rollback rehearses immutable backup/restore without changing source',()=>{
 const prior=structuredClone(seed);
 const result=simulateRollback(seed,{project_id:'a',next_action:'new'});
 assert.deepEqual(seed,prior);
 assert.notEqual(result.before_sha256,result.after_sha256);
 assert.equal(result.restored_sha256,result.before_sha256);
 assert.equal(result.restoredExactly,true);
 assert.equal(result.databaseBackedUp,false);
 assert.equal(result.liveMigrationReversed,false);
 assert.equal(result.operatorAccepted,false);
});
test('missing change and unknown project fail before any fake rollback claim',()=>{
 assert.throws(()=>simulateRollback(seed,{project_id:'not-found',next_action:'x'}));
 assert.throws(()=>simulateRollback(null,{}));
});
