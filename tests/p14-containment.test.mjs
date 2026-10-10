import test from 'node:test';import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {canonicalIncident} from '../src/lib/p12-compromise.mjs';
import {canonicalP13Witness} from '../src/lib/p13-witness-intake.mjs';
import {reconcileP14Containment} from '../src/lib/p14-containment.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const source='a'.repeat(40),artifact='b'.repeat(64),genesis='0'.repeat(64);
const root=generateKeyPairSync('ed25519'),alice=generateKeyPairSync('ed25519'),bob=generateKeyPairSync('ed25519');
const pem=x=>x.publicKey.export({format:'pem',type:'spki'});
const sig=(s,k)=>sign(null,Buffer.from(s),k.privateKey).toString('base64');
function sample(compromise=false){
 const record={schema:'control-p12-incident-v1',sequence:0,
  kind:compromise?'compromise':'rotation',previous_sha256:genesis,
  nonce:'1'.repeat(64),evidence_sha256:'d'.repeat(64),
  source_sha:source,artifact_sha256:artifact,
  subject_key_id:compromise?'alice':'previous_operator',
  replacement_key_id:compromise?null:'new_operator',
  effective_at:'2026-10-10T11:00:00.000Z'};
 const msg=canonicalIncident(record),incidentHead=hash(msg);
 const incidentContext={events:[{record,root_signature:sig(msg,root)}],
  rootPublicKeyPem:pem(root),pinnedRootSha256:hash(pem(root)),
  pinnedGenesisSha256:genesis,pinnedHeadSha256:incidentHead};
 const w={schema:'control-p13-witness-intake-v1',kind:'android_device',
  source_sha:source,artifact_sha256:artifact,evidence_sha256:'e'.repeat(64),
  object_sha256:'f'.repeat(64),rights_sha256:'d'.repeat(64),
  previous_sha256:genesis,nonce:'2'.repeat(32),
  observer_id:'alice',auditor_id:'bob',observer_org:'org_a',auditor_org:'org_b',
  classification:'metadata_only_unverified',issued_at:'2026-10-10T11:10:00.000Z'};
 const m=canonicalP13Witness(w),witnessHead=hash(m);
 const reviewerKeys={alice:pem(alice),bob:pem(bob)};
 const witnessContext={entries:[{record:w,observer_signature:sig(m,alice),
  auditor_signature:sig(m,bob)}],pinnedGenesisSha256:genesis,pinnedHeadSha256:witnessHead,
  reviewerKeys,reviewerKeyPins:{alice:hash(pem(alice)),bob:hash(pem(bob))}};
 return {incidentContext,witnessContext,expectedSourceSha:source,expectedArtifactSha:artifact,
  now:'2026-10-10T11:20:00.000Z',
  independentlyPinnedIncidentHead:incidentHead,independentlyPinnedWitnessHead:witnessHead};
}
test('two independently pinned chains with uncompromised synthetic signers stay nonreleasing',()=>{
 const v=reconcileP14Containment(sample());
 assert.equal(v.cryptographic_metadata_consistent,true);
 assert.equal(v.physical_review_verified,false);assert.equal(v.release_authorized,false);
});
test('valid historic signature is quarantined when observer is independently marked compromised',()=>{
 assert.throws(()=>reconcileP14Containment(sample(true)),/Compromised\/revoked/);
});
test('forged external incident root or witness pin fails closed',()=>{
 const s=sample();
 assert.throws(()=>reconcileP14Containment({...s,independentlyPinnedIncidentHead:'f'.repeat(64)}));
 assert.throws(()=>reconcileP14Containment({...s,independentlyPinnedWitnessHead:'f'.repeat(64)}));
});
