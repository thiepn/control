/**
 * Oracle for real, concurrent optimistic-version writes.
 * Accept exactly one committed version increment and one rejected competitor.
 * Does not substitute for invoking two real SQL calls in parallel.
 * @param {Array<{status:number,data?:{version?:number,next_action?:string}}>} results
 * @param {number} previousVersion
 * @returns {{version:number,next_action:string}}
 */
export function assertOptimisticRace(results, previousVersion) {
  if (!Array.isArray(results) || results.length !== 2 || !Number.isSafeInteger(previousVersion)) {
    throw new Error('RLS qualification failed: invalid concurrent-write results');
  }
  const accepted = results.filter(x => x.status === 200 && x.data?.version === previousVersion + 1);
  const refused = results.filter(x => x.status >= 400 && x.status < 600);
  if (accepted.length !== 1 || refused.length !== 1 || accepted[0].data?.next_action !== 'Concurrent Alpha' && accepted[0].data?.next_action !== 'Concurrent Beta') {
    throw new Error('RLS qualification failed: two concurrent writes must commit once and reject one competitor');
  }
  return accepted[0].data;
}
