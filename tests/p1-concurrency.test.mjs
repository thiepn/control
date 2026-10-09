import test from 'node:test';
import assert from 'node:assert/strict';
import { assertOptimisticRace } from './helpers/optimistic-race.mjs';

const ok = (value, action='Concurrent Alpha') => ({ status: 200, data: { version: value, next_action: action } });
const conflict = { status: 400, data: { code: 'P0002' } };
test('accept exactly one successful competing update and one rejection, in either response order', () => {
  assert.deepEqual(assertOptimisticRace([ok(3), conflict], 2), ok(3).data);
  assert.deepEqual(assertOptimisticRace([conflict, ok(3,'Concurrent Beta')], 2), ok(3,'Concurrent Beta').data);
});
test('reject lost updates and unverified concurrency outcomes', () => {
  const scenarios = [
    [ok(3), ok(3)], [conflict, conflict], [ok(4), conflict],
    [ok(3, 'Unexpected value'), conflict], [{ status: 201, data: {version:3} }, conflict],
    [ok(3)], [{ status:200, data:null },conflict]
  ];
  for (const scenario of scenarios) assert.throws(() => assertOptimisticRace(scenario, 2), /qualification failed/);
  assert.throws(() => assertOptimisticRace([ok(3), conflict], Number.NaN), /qualification failed/);
});
