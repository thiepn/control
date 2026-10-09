import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregateProgress,deadlineSignal} from '../src/lib/progress.mjs';
const m=(w,f,grade='user_reported',extra={})=>({weight:w,completion_fraction:f,evidence_grade:grade,release_gate:'none',...extra});
test('progress remains unassessed without milestones',()=>{
 assert.deepEqual(aggregateProgress([]),{reported:null,verified:null,fullyVerified:false,unassessed:true});
});
test('weighted progress never mistakes user-report for verification',()=>{
 assert.deepEqual(aggregateProgress([m(3,1),m(1,0.5)]),
 {reported:87.5,verified:0,fullyVerified:false,unassessed:false});
});
test('human/automated gates cannot be called verified unless explicitly passed',()=>{
 const a=m(1,1,'verified',{verified_by:'reviewer',verified_at:'2026-10-09',release_gate:'human',gate_passed:false});
 assert.equal(aggregateProgress([a]).verified,0);
 assert.equal(aggregateProgress([{...a,gate_passed:true}]).fullyVerified,true);
});
test('reject malformed weights/fractions and date signal boundaries',()=>{
 assert.throws(()=>aggregateProgress([m(0,1)]));
 assert.throws(()=>aggregateProgress([m(1,1.2)]));
 assert.equal(deadlineSignal(null,'2026-10-09'),'none');
 assert.equal(deadlineSignal('2026-10-08','2026-10-09'),'overdue');
 assert.equal(deadlineSignal('2026-10-16','2026-10-09'),'upcoming');
 assert.equal(deadlineSignal('2026-10-17','2026-10-09'),'scheduled');
});
