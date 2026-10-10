// Source/object, rights and human/physical-review provenance is checked only as signed DIGESTS.
// No rights grant, external review, physical event or human acceptance is created here.
import {createHash,createPublicKey,verify} from 'node:crypto';
const H=/^[0-9a-f]{64}$/,S=/^[0-9a-f]{40}$/,N=/^[0-9a-f]{32}$/;
const TYPES=new Set(['android_device','ios_device','screen_reader','privacy_review','source_rights','object_custody','offline_recovery']);
const sha=v=>createHash('sha256').update(v).digest('hex');
export function canonicalProvenance(v){
 if(!v||v.schema!=='control-p12-provenance-v1'||!TYPES.has(v.kind)
  ||!S.test(v.source_sha||'')||!H.test(v.artifact_sha256||'')
  ||!H.test(v.object_sha256||'')||!H.test(v.rights_sha256||'')
  ||!H.test(v.previous_record_sha256||'')||!H.test(v.evidence_sha256||'')
  ||!N.test(v.nonce||'')||typeof v.reviewer!=='string'
  ||!/^[a-zA-Z0-9._-]{3,80}$/.test(v.reviewer)
  ||v.classification!=='metadata_only_unverified'
  ||typeof v.observed_at!=='string'
  ||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v.observed_at)
  ||!Number.isFinite(Date.parse(v.observed_at))
  ||new Date(v.observed_at).toISOString()!==v.observed_at)
  throw Error('Malformed immutable provenance record');
 return JSON.stringify({schema:v.schema,kind:v.kind,source_sha:v.source_sha,
  artifact_sha256:v.artifact_sha256,object_sha256:v.object_sha256,
  rights_sha256:v.rights_sha256,previous_record_sha256:v.previous_record_sha256,
  evidence_sha256:v.evidence_sha256,nonce:v.nonce,reviewer:v.reviewer,
  classification:v.classification,observed_at:v.observed_at});
}
export function auditProvenanceChain({records,pinnedGenesisSha256,pinnedHeadSha256,
 expectedSourceSha,expectedArtifactSha,reviewerKeys,now}){
 if(!Array.isArray(records)||!records.length||records.length>100
  ||!H.test(pinnedGenesisSha256||'')||!H.test(pinnedHeadSha256||'')
  ||!S.test(expectedSourceSha||'')||!H.test(expectedArtifactSha||'')
  ||!reviewerKeys||typeof reviewerKeys!=='object'
  ||!Number.isFinite(Date.parse(now||'')))
  throw Error('Externally trusted provenance context required');
 let last=pinnedGenesisSha256,lastAt=-Infinity;const nonces=new Set();
 for(const item of records){
  const {record,signature}=item||{},msg=canonicalProvenance(record);
  const at=Date.parse(record.observed_at);
  if(record.previous_record_sha256!==last||at<=lastAt||at>Date.parse(now)
   ||record.source_sha!==expectedSourceSha||record.artifact_sha256!==expectedArtifactSha
   ||nonces.has(record.nonce)||!Object.hasOwn(reviewerKeys,record.reviewer))
   throw Error('Provenance history substitution, replay, future timestamp or untrusted reviewer');
  let valid=false;try{
   const pub=createPublicKey(reviewerKeys[record.reviewer]);
   valid=pub.asymmetricKeyType==='ed25519'&&typeof signature==='string'
    &&/^[A-Za-z0-9+/]{86}==$/.test(signature)
    &&verify(null,Buffer.from(msg),pub,Buffer.from(signature,'base64'));
  }catch{valid=false;}
  if(!valid)throw Error('Provenance metadata signature invalid');
  last=sha(msg);lastAt=at;nonces.add(record.nonce);
 }
 if(last!==pinnedHeadSha256)throw Error('Independent provenance head mismatch');
 return {schema:'control-p12-provenance-audit-v1',head_sha256:last,records_verified:records.length,
  classification:'metadata_only_unverified',rights_granted:false,
  physical_approval:false,human_acceptance:false,release_authorized:false};
}
