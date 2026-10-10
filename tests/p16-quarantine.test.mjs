import test from 'node:test';import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {canonicalP15Consent} from '../src/lib/p15-consent.mjs';
import {canonicalIncident} from '../src/lib/p12-compromise.mjs';
import {reconcileP16Quarantine} from '../src/lib/p16-quarantine.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const root=generateKeyPairSync('ed25519'),a=generateKeyPairSync('ed25519'),b=generateKeyPairSync('ed25519');
const pem=k=>k.publicKey.export({type:'spki',format:'pem'});
const sha='a'.repeat(40),artifact='b'.repeat(64),zero='0'.repeat(64);
const signerKeys={custodian_a:pem(a),auditor_b:pem(b)};
const signerKeyPins=Object.fromEntries(Object.entries(signerKeys).map(([k,p])=>[k,hash(p)]));
const signature=(msg,k)=>sign(null,Buffer.from(msg),k.privateKey).toString('base64');
function fixture({withdrawn=true,compromised=false}={}){
 let prev=zero;const actions=withdrawn?['grant_claim','revoke_claim']:['grant_claim'];
 const entries=actions.map((action,i)=>{
  const record={schema:'control-p15-consent-v1',action,
   source_sha:sha,artifact_sha256:artifact,object_sha256:'c'.repeat(64),
   rights_sha256:'d'.repeat(64),evidence_sha256:'e'.repeat(64),
   previous_sha256:prev,nonce:String(i+1).padStart(32,'0'),
   subject_id:'anonymous_1',custodian_id:'custodian_a',independent_auditor_id:'auditor_b',
   classification:'UNVERIFIED_EXTERNAL_METADATA',
   issued_at:'2026-10-10T11:'+String(i+10).padStart(2,'0')+':00.000Z'};
  const msg=canonicalP15Consent(record);prev=hash(msg);
  return {record,custodian_signature:signature(msg,a),auditor_signature:signature(msg,b)};
 });
 const consentHead=prev;
 const inc={schema:'control-p12-incident-v1',sequence:0,
  kind:compromised?'compromise':'rotation',previous_sha256:zero,
  nonce:'f'.repeat(64),evidence_sha256:'b'.repeat(64),
  source_sha:sha,artifact_sha256:artifact,
  subject_key_id:compromised?'custodian_a':'previous_operator',
  replacement_key_id:compromised?null:'replacement_operator',
  effective_at:'2026-10-10T11:00:00.000Z'};
 const incMsg=canonicalIncident(inc),incidentHead=hash(incMsg);
 return {consentContext:{entries,signerKeys,signerKeyPins,pinnedGenesisSha256:zero,
  pinnedHeadSha256:consentHead},incidentContext:{
  events:[{record:inc,root_signature:signature(incMsg,root)}],
  rootPublicKeyPem:pem(root),pinnedRootSha256:hash(pem(root)),
  pinnedGenesisSha256:zero,pinnedHeadSha256:incidentHead},
  independentlyPinnedConsentHead:consentHead,
  independentlyPinnedIncidentHead:incidentHead,
  expectedSourceSha:sha,expectedArtifactSha:artifact,now:'2026-10-10T11:20:00.000Z'};
}
test('valid synthetic withdrawal remains quarantined without pretending to verify consent',()=>{
 const r=reconcileP16Quarantine(fixture());
 assert.equal(r.withdrawals,1);assert.equal(r.quarantine_required,true);
 assert.equal(r.status,'QUARANTINED');assert.equal(r.actual_subject_identity_verified,false);
 assert.equal(r.release_authorized,false);
});
test('nonwithdrawn synthetic grant still does not certify real acceptance',()=>{
 const r=reconcileP16Quarantine(fixture({withdrawn:false}));
 assert.equal(r.status,'AWAITING_REAL_HUMAN_ACCEPTANCE');
 assert.equal(r.reissued_human_consent_verified,false);
});
test('compromised signer quarantines historically valid consent signatures by failure',()=>{
 assert.throws(()=>reconcileP16Quarantine(fixture({compromised:true})),/Compromised or untrusted/);
});
test('externally pinned roots, source and consent history cannot be replaced',()=>{
 const x=fixture();
 for(const q of [
  {...x,independentlyPinnedConsentHead:'f'.repeat(64)},
  {...x,independentlyPinnedIncidentHead:'f'.repeat(64)},
  {...x,expectedSourceSha:'f'.repeat(40)},
  {...x,consentContext:{...x.consentContext,entries:x.consentContext.entries.slice(0,1)}}
 ])assert.throws(()=>reconcileP16Quarantine(q));
});
