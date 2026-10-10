import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {canonicalTrustEvent,auditTrustEpochs} from '../src/lib/p11-trust.mjs';
const digest=s=>createHash('sha256').update(s).digest('hex'),genesis='0'.repeat(64);
const root=generateKeyPairSync('ed25519'),keyA=generateKeyPairSync('ed25519'),keyB=generateKeyPairSync('ed25519');
const pem=k=>k.publicKey.export({format:'pem',type:'spki'});
const sig=(msg,key)=>sign(null,Buffer.from(msg),key.privateKey).toString('base64');
export function syntheticTrustFixture(){
 const first={schema:'control-p11-trust-event-v1',sequence:0,previous_sha256:genesis,
  key_id:'reviewer_a',public_key_pem:pem(keyA),effective_at:'2026-10-10T11:00:00.000Z',
  revoked_key_ids:[]};
 const m1=canonicalTrustEvent(first);
 const second={...first,sequence:1,previous_sha256:digest(m1),key_id:'reviewer_b',
  public_key_pem:pem(keyB),effective_at:'2026-10-10T11:10:00.000Z',
  revoked_key_ids:['reviewer_a']};
 const m2=canonicalTrustEvent(second);
 const events=[{record:first,root_signature:sig(m1,root),prior_signature:null},
  {record:second,root_signature:sig(m2,root),prior_signature:sig(m2,keyA)}];
 const trust={events,rootPublicKeyPem:pem(root),
  pinnedRootSha256:digest(pem(root)),pinnedGenesisSha256:genesis,
  pinnedHeadSha256:digest(m2),now:'2026-10-10T11:20:00.000Z'};
 return {trust,keyA,keyB};
}
test('externally pinned rotation and revocation retains only latest reviewer',()=>{
 const {trust}=syntheticTrustFixture(),result=auditTrustEpochs(trust);
 assert.equal(result.events_verified,2);assert.equal(result.releaseAuthorized,false);
 assert.deepEqual(Object.keys(result.activeKeys),['reviewer_b']);
 assert.deepEqual(result.revokedKeyIds,['reviewer_a']);
});
test('missing trusted independent head/root, forged rotation, replay, revoked signer and chronology fail',()=>{
 const {trust}=syntheticTrustFixture();
 for(const altered of [
  {...trust,pinnedHeadSha256:'f'.repeat(64)},
  {...trust,pinnedRootSha256:'f'.repeat(64)},
  {...trust,events:trust.events.slice(0,1)},
  {...trust,now:'2026-10-10T11:05:00.000Z'},
  {...trust,events:[trust.events[0],{...trust.events[1],root_signature:'a'.repeat(88)}]},
  {...trust,events:[trust.events[0],{...trust.events[1],prior_signature:'a'.repeat(88)}]},
  {...trust,events:[trust.events[0],{...trust.events[1],record:{...trust.events[1].record,revoked_key_ids:['stranger']}}]},
  {...trust,events:[trust.events[0],{...trust.events[1],record:{...trust.events[1].record,key_id:'reviewer_a'}}]}
 ])assert.throws(()=>auditTrustEpochs(altered));
});
test('non-Ed25519, reordered hashes, malformed timestamps and duplicate revocation refuse',()=>{
 const {trust}=syntheticTrustFixture();
 for(const bad of [
  {...trust.events[1].record,previous_sha256:'1'.repeat(64)},
  {...trust.events[1].record,revoked_key_ids:['reviewer_a','reviewer_a']},
  {...trust.events[1].record,effective_at:'not_a_date'},
  {...trust.events[1].record,sequence:-1}
 ])assert.throws(()=>auditTrustEpochs({...trust,events:[trust.events[0],{...trust.events[1],record:bad}]}));
});
