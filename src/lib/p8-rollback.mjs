// Deterministic memory-only rehearsal, NOT a real backup or applied migration.
import {sha256} from './p8-decision.mjs';
const encode=obj=>JSON.stringify(obj);
export function simulateRollback(snapshot,change){
 if(!snapshot||!Array.isArray(snapshot.projects)||!Array.isArray(snapshot.reviews)
  ||!change||typeof change.project_id!=='string'||typeof change.next_action!=='string')
  throw Error('Invalid isolated rollback fixture');
 const original=structuredClone(snapshot),before=sha256(encode(original));
 const changed=structuredClone(original);
 const project=changed.projects.find(p=>p.id===change.project_id);
 if(!project)throw Error('Mutation target missing');
 project.next_action=change.next_action;project.version++;
 const after=sha256(encode(changed));
 // Simulate restoring from a verified immutable original, not a live database.
 const restored=structuredClone(original),restoredDigest=sha256(encode(restored));
 if(restoredDigest!==before||after===before)throw Error('Rollback rehearsal integrity invalid');
 return {before_sha256:before,after_sha256:after,restored_sha256:restoredDigest,
  restoredExactly:true,source:'synthetic_fixture_only',
  databaseBackedUp:false,liveMigrationReversed:false,operatorAccepted:false};
}
