// Independent CI runner provenance: two separate workers, exact source and byte-identical emitted files.
// Does NOT authenticate GitHub's infrastructure, signify an OCI-image match or authorize release.
import {makeExecutableManifest,compareExecutableManifests} from './p10-binary.mjs';
const SHA=/^[0-9a-f]{40}$/;
export function sealWorkerManifest({worker,runnerName,runId,runAttempt,sourceSha,treeSha,entries}){
 if(!['alpha','beta'].includes(worker)||typeof runnerName!=='string'
  ||runnerName.length<3||runnerName.length>160
  ||!Number.isSafeInteger(runId)||runId<=0
  ||!Number.isSafeInteger(runAttempt)||runAttempt<=0||!SHA.test(sourceSha||''))
  throw Error('Independent CI worker identity and source required');
 return {schema:'control-p11-independent-worker-v1',worker,runner_name:runnerName,
  workflow_run_id:runId,workflow_attempt:runAttempt,
  executable:makeExecutableManifest({sourceSha,treeSha,entries}),
  release_authorized:false,production_key_used:false,deployable:false,
  note:'CI-only synthetic Server Action key; distinct runners, not independent organizations'};
}
export function compareIndependentWorkers(a,b,sourceSha){
 if(!a||!b||a.schema!=='control-p11-independent-worker-v1'
  ||b.schema!==a.schema||a.worker!=='alpha'||b.worker!=='beta'
  ||a.runner_name===b.runner_name||a.workflow_run_id!==b.workflow_run_id
  ||a.workflow_attempt!==b.workflow_attempt||!SHA.test(sourceSha||'')
  ||a.executable?.source_sha!==sourceSha||b.executable?.source_sha!==sourceSha
  ||a.release_authorized!==false||b.release_authorized!==false
  ||a.production_key_used!==false||b.production_key_used!==false
  ||a.deployable!==false||b.deployable!==false)
  throw Error('Independent runner provenance missing, conflicting or forged');
 const result=compareExecutableManifests(a.executable,b.executable);
 return {schema:'control-p11-independent-comparison-v1',
  source_sha:sourceSha,tree_sha:a.executable.tree_sha,
  executable_sha256:result.sha256,files_compared:result.count,
  separate_runner_names:[a.runner_name,b.runner_name],
  independent_jobs_verified:true,files_matched:true,
  scope:'selected_js_css_wasm_only',
  release_authorized:false,deployment_authorized:false,production_image_verified:false,
  note:'Independent GitHub-hosted jobs only; build uses synthetic nonproduction key'};
}
