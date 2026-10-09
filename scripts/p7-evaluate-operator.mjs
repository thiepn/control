// Offline operator gate; never a merge, database migration, or deployment action.
import {readFileSync} from 'node:fs';
import {evaluateSignedReadiness} from '../src/lib/p7-release.mjs';
import {execFileSync} from 'node:child_process';
const env=process.env;
for(const key of ['P7_OPERATOR_ATTESTATION_FILE','P7_OPERATOR_SIGNATURE_FILE',
 'P7_TRUSTED_OPERATOR_PUBLIC_KEY_FILE','P7_EXPECTED_ARTIFACT_SHA256'])
 if(!env[key])throw Error('Missing externally authorized operator review input: '+key);
const result=evaluateSignedReadiness({
 attestation:JSON.parse(readFileSync(env.P7_OPERATOR_ATTESTATION_FILE,'utf8')),
 signature:readFileSync(env.P7_OPERATOR_SIGNATURE_FILE,'utf8').trim(),
 publicKeyPem:readFileSync(env.P7_TRUSTED_OPERATOR_PUBLIC_KEY_FILE,'utf8'),
 sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 artifactSha:env.P7_EXPECTED_ARTIFACT_SHA256,now:new Date().toISOString()
});
if(!result.ready)throw Error('Operator review denied: '+result.reasons.join('; '));
console.log('External signed review matches source/artifact. Deployment remains NOT AUTHORIZED.');
