// Explicit opt-in, read-only staging preflight. Never provisions or authenticates accounts.
import {execFileSync} from 'node:child_process';
import {validateStaging} from '../src/lib/p7-staging.mjs';
export function qualifyP9Staging(env,head,reader){
 if(!/^[0-9a-f]{40}$/.test(head||'')
  ||env.CONTROL_P9_APPROVED_SOURCE_HEAD!==head
  ||env.CONTROL_P9_OPERATOR_SCOPE!=='DISPOSABLE_STAGING_ONLY')
  throw Error('P9 requires reviewed exact source and strictly disposable scope');
 const staging=validateStaging(env,reader);
 if(env.CONTROL_P9_APPROVED_STAGING_ORIGIN!==
  new URL(env.CONTROL_TEST_SUPABASE_URL).origin)
  throw Error('P9 approved origin mismatch');
 if(!env.CONTROL_P7_DENIED_PRODUCTION_HOSTS?.trim())
  throw Error('P9 explicitly denied production hosts required');
 return {...staging,p9Gate:'configuration_only',realUserIdentityVerified:false,
  releaseAuthorized:false,deploymentAuthorized:false};
}
if(process.argv[1]?.endsWith('p9-staging-preflight.mjs')){
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const result=qualifyP9Staging(process.env,head);
 console.log('P9 disposable staging configuration preflight accepted for project '+result.projectRef+
  '; no real Auth testing, user provisioning or production approval.');
}
