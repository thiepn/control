// Immutable off-Git *review request* manifest; not a rights license or external acceptance.
import {createHash} from 'node:crypto';
const H=/^[0-9a-f]{64}$/,S=/^[0-9a-f]{40}$/,N=/^[0-9a-f]{32}$/,ID=/^[A-Za-z0-9._-]{3,80}$/;
const SURFACES=new Set(['android_chrome','ios_safari','nvda','voiceover','rights_provenance',
 'privacy_review','offline_recovery','disposable_restore','independent_image_build']);
export function canonicalP14Handoff(r){
 if(!r||r.schema!=='control-p14-handoff-v1'||!SURFACES.has(r.surface)
  ||!S.test(r.source_sha||'')||!H.test(r.artifact_sha256||'')
  ||!H.test(r.evidence_sha256||'')||!H.test(r.object_sha256||'')
  ||!H.test(r.rights_sha256||'')||!H.test(r.custody_head_sha256||'')
  ||!N.test(r.nonce||'')||!ID.test(r.reviewer_role||'')
  ||!ID.test(r.request_id||'')||r.classification!=='REVIEW_REQUEST_ONLY'
  ||r.scope!=='OFF_REPO_METADATA_ONLY')
  throw Error('Malformed external human review intake request');
 return JSON.stringify({schema:r.schema,surface:r.surface,source_sha:r.source_sha,
  artifact_sha256:r.artifact_sha256,evidence_sha256:r.evidence_sha256,
  object_sha256:r.object_sha256,rights_sha256:r.rights_sha256,
  custody_head_sha256:r.custody_head_sha256,nonce:r.nonce,
  reviewer_role:r.reviewer_role,request_id:r.request_id,
  classification:r.classification,scope:r.scope});
}
export function reconcileP14Handoff({records,expectedSourceSha,expectedArtifactSha,
 independentlyPinnedCustodyHeadSha256}){
 if(!Array.isArray(records)||records.length>20||!S.test(expectedSourceSha||'')
  ||!H.test(expectedArtifactSha||'')||!H.test(independentlyPinnedCustodyHeadSha256||''))
  throw Error('Independently pinned intake scope required');
 const seen=new Set(),nonces=new Set(),ids=new Set(),digests=[];
 for(const record of records){
  const serialized=canonicalP14Handoff(record);
  if(record.source_sha!==expectedSourceSha||record.artifact_sha256!==expectedArtifactSha
   ||record.custody_head_sha256!==independentlyPinnedCustodyHeadSha256
   ||seen.has(record.surface)||nonces.has(record.nonce)||ids.has(record.request_id))
   throw Error('Repeated or source-swapped off-Git intake request');
  seen.add(record.surface);nonces.add(record.nonce);ids.add(record.request_id);
  digests.push(createHash('sha256').update(serialized).digest('hex'));
 }
 return {schema:'control-p14-handoff-reconciliation-v1',source_sha:expectedSourceSha,
  requested:records.length,requested_surfaces:[...seen],request_digests:digests,
  status:'AWAITING_INDEPENDENT_HUMAN_REVIEW',
  actual_human_review_collected:false,real_device_verified:false,
  rights_ownership_verified:false,real_supabase_restore_verified:false,
  release_authorized:false};
}
