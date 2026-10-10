// Independent recovery/build WITNESS contracts; never executes a remote restore or deployment.
import {createHash,createPublicKey,verify} from 'node:crypto';
const H=/^[a-f0-9]{64}$/,S=/^[a-f0-9]{40}$/;
const digest=x=>createHash('sha256').update(x).digest('hex');
export function canonicalWitness(v){
 if(!v||v.schema!=='control-p12-external-witness-v1'
  ||!['disposable_restore','separate_governance_build'].includes(v.kind)
  ||!S.test(v.source_sha||'')||!H.test(v.artifact_sha256||'')
  ||!H.test(v.observed_evidence_sha256||'')
  ||!H.test(v.custody_pin_sha256||'')
  ||!H.test(v.nonce||'')
  ||!(/^[A-Za-z0-9._-]{3,80}$/).test(v.witness_id||'')
  ||v.disposition!=='REVIEW_ONLY'
  ||typeof v.observed_at!=='string'||!Number.isFinite(Date.parse(v.observed_at))
  ||new Date(v.observed_at).toISOString()!==v.observed_at)
  throw Error('Malformed nonrelease witness');
 return JSON.stringify({schema:v.schema,kind:v.kind,source_sha:v.source_sha,
  artifact_sha256:v.artifact_sha256,observed_evidence_sha256:v.observed_evidence_sha256,
  custody_pin_sha256:v.custody_pin_sha256,nonce:v.nonce,witness_id:v.witness_id,
  disposition:v.disposition,observed_at:v.observed_at});
}
export function verifyExternalWitness({record,signature,witnessPublicKeyPem,
 pinnedWitnessKeySha256,pinnedCustodySha256,expectedSourceSha,expectedArtifactSha,now}){
 const msg=canonicalWitness(record);
 if(!H.test(pinnedWitnessKeySha256||'')||!H.test(pinnedCustodySha256||'')
  ||!S.test(expectedSourceSha||'')||!H.test(expectedArtifactSha||'')
  ||!Number.isFinite(Date.parse(now||''))
  ||digest(witnessPublicKeyPem)!==pinnedWitnessKeySha256
  ||record.source_sha!==expectedSourceSha||record.artifact_sha256!==expectedArtifactSha
  ||record.custody_pin_sha256!==pinnedCustodySha256
  ||Date.parse(record.observed_at)>Date.parse(now))
  throw Error('Out-of-band witness pins, source, artifact or chronology mismatch');
 let valid=false;try{
  const k=createPublicKey(witnessPublicKeyPem);
  valid=k.asymmetricKeyType==='ed25519'&&typeof signature==='string'
   &&/^[A-Za-z0-9+/]{86}==$/.test(signature)
   &&verify(null,Buffer.from(msg),k,Buffer.from(signature,'base64'));
 }catch{valid=false;}
 if(!valid)throw Error('Independent witness signature invalid');
 return {schema:'control-p12-witness-audit-v1',kind:record.kind,
  witness_record_sha256:digest(msg),signed_metadata_verified:true,
  operation_performed_by_this_module:false,real_operation_confirmed:false,
  external_operator_approved:false,release_authorized:false};
}
export function defaultDeniedP12({sourceSha,artifactSha}){
 if(!S.test(sourceSha||'')||!H.test(artifactSha||''))throw Error('Exact source/artifact required');
 return {schema:'control-p12-release-closure-v1',source_sha:sourceSha,
  artifact_sha256:artifactSha,decision:'DENY',release_authorized:false,
  merge_authorized:false,deployment_authorized:false,migration_authorized:false,
  missing:['P1_disposable_auth','human_review','real_android','real_ios','nvda_voiceover',
   'privacy_rights','offline_recovery','real_restore','external_signer_custody',
   'compromise_rotation_chronology','immutable_source_object_rights','physical_review_provenance',
   'external_recovery_witness','independent_governance_build','release_abort_owner',
   'separate_manual_release_approval'],
  physical_signoff:'NOT_COLLECTED',human_signoff:'NOT_COLLECTED',
  genuine_restoration:'NOT_COLLECTED',
  note:'Synthetic source evidence never satisfies external acceptance'};
}
