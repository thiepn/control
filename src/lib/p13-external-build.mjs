// Separate organizational BUILD PROVENANCE preparation; no independent build is executed here.
import {createHash,createPublicKey,verify} from 'node:crypto';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/,ID=/^[a-zA-Z0-9._-]{3,80}$/;
const sha=x=>createHash('sha256').update(x).digest('hex');
export function canonicalP13Builder(v){
 if(!v||v.schema!=='control-p13-build-witness-v1'
  ||!S.test(v.source_sha||'')||!S.test(v.tree_sha||'')
  ||!H.test(v.executable_sha256||'')||!H.test(v.toolchain_sha256||'')
  ||!ID.test(v.organization_id||'')||!ID.test(v.witness_id||'')
  ||!Number.isSafeInteger(v.files_compared)||v.files_compared<1
  ||v.scope!=='synthetic_js_css_wasm_only'
  ||v.classification!=='external_claim_unverified')
  throw Error('Invalid externally witnessed build metadata');
 return JSON.stringify({schema:v.schema,source_sha:v.source_sha,tree_sha:v.tree_sha,
  executable_sha256:v.executable_sha256,toolchain_sha256:v.toolchain_sha256,
  organization_id:v.organization_id,witness_id:v.witness_id,
  files_compared:v.files_compared,scope:v.scope,classification:v.classification});
}
export function auditP13ExternalBuilders({attestations,expectedSourceSha,expectedTreeSha,
 expectedExecutableSha256,organizationKeys,organizationKeyPins}){
 if(!Array.isArray(attestations)||attestations.length!==2||!S.test(expectedSourceSha||'')
  ||!S.test(expectedTreeSha||'')||!H.test(expectedExecutableSha256||'')
  ||!organizationKeys||!organizationKeyPins)throw Error('Two external independently pinned builder claims required');
 const orgs=new Set(),pins=new Set();let count=null;
 for(const input of attestations){
  const {record,signature}=input||{},msg=canonicalP13Builder(record);
  const org=record.organization_id,pub=organizationKeys[org],pin=organizationKeyPins[org];
  if(orgs.has(org)||!Object.hasOwn(organizationKeys,org)
   ||!H.test(pin||'')||sha(pub)!==pin||pins.has(pin)
   ||record.source_sha!==expectedSourceSha||record.tree_sha!==expectedTreeSha
   ||record.executable_sha256!==expectedExecutableSha256
   ||(count!==null&&record.files_compared!==count))
   throw Error('Builder organization, key, expected source or executable mismatch');
  let valid=false;try{const k=createPublicKey(pub);valid=k.asymmetricKeyType==='ed25519'
   &&typeof signature==='string'&&/^[A-Za-z0-9+/]{86}==$/.test(signature)
   &&verify(null,Buffer.from(msg),k,Buffer.from(signature,'base64'));}catch{valid=false;}
  if(!valid)throw Error('Externally signed builder claim invalid');
  count=record.files_compared;orgs.add(org);pins.add(pin);
 }
 return {schema:'control-p13-build-audit-v1',source_sha:expectedSourceSha,
  executable_sha256:expectedExecutableSha256,files_compared:count,
  distinct_organization_claims_verified:2,independent_organizational_control_verified:false,
  production_image_verified:false,release_authorized:false,
  note:'Two signed external claims are not proof of actual independent builder custody'};
}
