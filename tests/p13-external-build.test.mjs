import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {canonicalP13Builder,auditP13ExternalBuilders} from '../src/lib/p13-external-build.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const A=generateKeyPairSync('ed25519'),B=generateKeyPairSync('ed25519');
const pub=k=>k.publicKey.export({format:'pem',type:'spki'});
const orgs={org_alpha:A,org_beta:B},organizationKeys=Object.fromEntries(Object.entries(orgs).map(([k,v])=>[k,pub(v)]));
const organizationKeyPins=Object.fromEntries(Object.entries(organizationKeys).map(([k,v])=>[k,sha(v)]));
const source='a'.repeat(40),tree='b'.repeat(40),exe='c'.repeat(64);
function fixture(){
 const attestations=Object.entries(orgs).map(([organization_id,k])=>{
  const record={schema:'control-p13-build-witness-v1',source_sha:source,tree_sha:tree,
   executable_sha256:exe,toolchain_sha256:'d'.repeat(64),
   organization_id,witness_id:organization_id+'_witness',
   files_compared:147,scope:'synthetic_js_css_wasm_only',
   classification:'external_claim_unverified'};
  return {record,signature:sign(null,Buffer.from(canonicalP13Builder(record)),k.privateKey).toString('base64')};
 });
 return {attestations,expectedSourceSha:source,expectedTreeSha:tree,
  expectedExecutableSha256:exe,organizationKeys,organizationKeyPins};
}
test('two independent synthetic org signer claims verify cryptographically but never certify organization custody',()=>{
 const r=auditP13ExternalBuilders(fixture());
 assert.equal(r.distinct_organization_claims_verified,2);
 assert.equal(r.independent_organizational_control_verified,false);
 assert.equal(r.production_image_verified,false);
});
test('same org, reused key, swapped digest, forgery, build count mismatch and scope promotion reject',()=>{
 const f=fixture();
 for(const v of [
  {...f,attestations:[f.attestations[0],f.attestations[0]]},
  {...f,organizationKeyPins:{...f.organizationKeyPins,org_beta:f.organizationKeyPins.org_alpha}},
  {...f,expectedExecutableSha256:'e'.repeat(64)},
  {...f,attestations:[f.attestations[0],{...f.attestations[1],signature:'A'.repeat(88)}]},
  {...f,attestations:[f.attestations[0],{...f.attestations[1],record:{...f.attestations[1].record,files_compared:148}}]},
  {...f,attestations:[f.attestations[0],{...f.attestations[1],record:{...f.attestations[1].record,scope:'production_image'}}]}
 ])assert.throws(()=>auditP13ExternalBuilders(v));
});
