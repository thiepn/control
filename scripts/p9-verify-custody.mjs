// External, offline and read-only custody check: input files stay outside public Git.
import {readFileSync} from 'node:fs';
import {verifyIndependentCustody} from '../src/lib/p9-custody.mjs';
if(process.argv[1]?.endsWith('p9-verify-custody.mjs')){
 const e=process.env,required=['P9_LEDGER_PATH','P9_CUSTODY_CHECKPOINT_FILE',
  'P9_CUSTODY_SIGNATURE_FILE','P9_CUSTODIAN_PUBLIC_KEY_FILE',
  'P9_PINNED_PREVIOUS_CHECKPOINT_SHA256','P9_EXPECTED_HEAD','P9_EXPECTED_ARTIFACT_SHA256'];
 for(const k of required)if(!e[k])throw Error('Missing externally supplied custody input: '+k);
 const r=verifyIndependentCustody({
  checkpoint:JSON.parse(readFileSync(e.P9_CUSTODY_CHECKPOINT_FILE,'utf8')),
  signature:readFileSync(e.P9_CUSTODY_SIGNATURE_FILE,'utf8').trim(),
  publicKeyPem:readFileSync(e.P9_CUSTODIAN_PUBLIC_KEY_FILE,'utf8'),
  ledger:JSON.parse(readFileSync(e.P9_LEDGER_PATH,'utf8')),
  sourceSha:e.P9_EXPECTED_HEAD,artifactSha:e.P9_EXPECTED_ARTIFACT_SHA256,
  pinnedPreviousCheckpointSha256:e.P9_PINNED_PREVIOUS_CHECKPOINT_SHA256,
  now:new Date().toISOString()});
 console.log('Offline custody verified; separately store checkpoint digest '+r.checkpoint_sha256+
  '. No release authorized.');
}
