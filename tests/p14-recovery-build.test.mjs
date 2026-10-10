import test from 'node:test';import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {canonicalP13Builder} from '../src/lib/p13-external-build.mjs';
import {reconcileP14BuildProvenance,prepareP14DisposableWitness} from '../src/lib/p14-recovery-build.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const A=generateKeyPairSync('ed25519'),B=generateKeyPairSync('ed25519');
const orgs={org_alpha:A,org_beta:B},pub=k=>k.publicKey.export({type:'spki',format:'pem'});
const organizationKeys=Object.fromEntries(Object.entries(orgs).map(([k,v])=>[k,pub(v)]));
const organizationKeyPins=Object.fromEntries(Object.entries(organizationKeys).map(([k,v])=>[k,hash(v)]));
const source='a'.repeat(40),tree='b'.repeat(40),exe='c'.repeat(64),image='d'.repeat(64);
function fixture(){
 const attestations=Object.entries(orgs).map(([organization_id,key])=>{
  const record={schema:'control-p13-build-witness-v1',source_sha:source,tree_sha:tree,
   executable_sha256:exe,toolchain_sha256:'e'.repeat(64),organization_id,
   witness_id:organization_id+'_witness',files_compared:147,
   scope:'synthetic_js_css_wasm_only',classification:'external_claim_unverified'};
  return {record,signature:sign(null,Buffer.from(canonicalP13Builder(record)),key.privateKey).toString('base64')};
 });
 return {buildContext:{attestations,organizationKeys,organizationKeyPins},
  independentlyPinnedSourceSha:source,independentlyPinnedTreeSha:tree,
  independentlyPinnedExecutableSha256:exe,independentlyPinnedImageSha256:image};
}
test('two synthetically signed builder claims cannot certify real outside-organization custody',()=>{
 const v=reconcileP14BuildProvenance({...fixture(),externalOrganizationsActuallyVerified:true});
 assert.equal(v.claim_count,2);assert.equal(v.externalOrganizationsActuallyVerifiedIgnored,true);
 assert.equal(v.actual_external_governance_verified,false);
 assert.equal(v.production_image_reproduced,false);assert.equal(v.release_authorized,false);
});
test('builder digest, image pin, forgery and shared organization keys fail',()=>{
 const f=fixture();
 for(const bad of [
  {...f,independentlyPinnedExecutableSha256:'0'.repeat(64)},
  {...f,independentlyPinnedImageSha256:'notdigest'},
  {...f,buildContext:{...f.buildContext,attestations:[f.buildContext.attestations[0],
   {...f.buildContext.attestations[1],signature:'A'.repeat(88)}]}},
  {...f,buildContext:{...f.buildContext,organizationKeyPins:
   {...f.buildContext.organizationKeyPins,org_beta:f.buildContext.organizationKeyPins.org_alpha}}}
 ])assert.throws(()=>reconcileP14BuildProvenance(bad));
});
test('recovery witness preparation is mandatory offline: cannot pass missing operator approval as restorable',()=>{
 assert.throws(()=>prepareP14DisposableWitness({
  independentlyPinnedWitnessKeySha256:'a'.repeat(64),
  independentlyPinnedCustodySha256:'b'.repeat(64),
  expectedSourceSha:source,expectedArtifactSha:exe,
  recoveryContext:{env:{}},witnessContext:{}
 }));
});
