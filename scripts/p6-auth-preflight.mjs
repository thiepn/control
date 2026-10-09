// Fail closed, never run real two-user acceptance against unknown or production Supabase.
import {readFileSync,existsSync} from 'node:fs';
const e=process.env;
if(e.CONTROL_TEST_DISPOSABLE!=='I_ACKNOWLEDGE_DISPOSABLE_PROJECT')
 throw Error('P6 real Auth requires explicit disposable-project attestation');
for(const key of ['CONTROL_TEST_SUPABASE_URL','CONTROL_TEST_PUBLISHABLE_KEY',
 'CONTROL_TEST_SERVICE_KEY','CONTROL_P6_USER_A_STORAGE','CONTROL_P6_USER_B_STORAGE']){
 if(!e[key])throw Error('Missing disposable Auth setting: '+key);
}
const url=new URL(e.CONTROL_TEST_SUPABASE_URL);
if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co'))
 throw Error('Test Supabase origin must be reviewed HTTPS Supabase project');
if(e.CONTROL_P6_REVIEWED_SUPABASE_HOST!==url.hostname)
 throw Error('Explicit approved disposable hostname does not match');
for(const file of [e.CONTROL_P6_USER_A_STORAGE,e.CONTROL_P6_USER_B_STORAGE]){
 if(!existsSync(file))throw Error('Authenticated browser storage file missing');
 const state=JSON.parse(readFileSync(file,'utf8'));
 if(!Array.isArray(state.cookies))throw Error('Invalid authenticated browser storage file');
}
if(e.CONTROL_P6_USER_A_STORAGE===e.CONTROL_P6_USER_B_STORAGE)
 throw Error('Two independently authenticated browser contexts required');
console.log('P6 disposable Auth preflight passed; no credentials emitted');
