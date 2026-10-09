// Offline-only preflight. No network, secret printing or database provisioning.
import {readFileSync} from 'node:fs';
export function validateStaging(env,read=readFileSync){
 const required=['CONTROL_TEST_SUPABASE_URL','CONTROL_P7_APPROVED_STAGING_HOST',
  'CONTROL_TEST_PUBLISHABLE_KEY','CONTROL_TEST_SERVICE_KEY',
  'CONTROL_P6_USER_A_STORAGE','CONTROL_P6_USER_B_STORAGE',
  'CONTROL_P7_TEST_PROJECT_REF'];
 if(env.CONTROL_TEST_DISPOSABLE!=='I_ACKNOWLEDGE_DISPOSABLE_PROJECT'
  ||env.CONTROL_P7_OPERATOR_SCOPE!=='DISPOSABLE_ONLY')
  throw Error('Staging requires two explicit disposable attestations');
 for(const key of required)if(!env[key])throw Error('Missing required disposable setting: '+key);
 let url;
 try{url=new URL(env.CONTROL_TEST_SUPABASE_URL);}catch{throw Error('Invalid staging URL');}
 if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')
   ||url.pathname!=='/'||url.search||url.hash||url.username||url.password)
  throw Error('Staging URL must be exact HTTPS Supabase project origin');
 if(env.CONTROL_P7_APPROVED_STAGING_HOST!==url.hostname
  ||env.CONTROL_P7_TEST_PROJECT_REF!==url.hostname.split('.')[0]
  ||! /^[a-z0-9]{15,32}$/.test(env.CONTROL_P7_TEST_PROJECT_REF))
  throw Error('Disposable project identity mismatch');
 const hosts=(env.CONTROL_P7_DENIED_PRODUCTION_HOSTS||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(hosts.includes(url.hostname))throw Error('Production host explicitly denied');
 if(env.CONTROL_P6_USER_A_STORAGE===env.CONTROL_P6_USER_B_STORAGE)
  throw Error('Two independent account session files required');
 const states=[];
 for(const path of [env.CONTROL_P6_USER_A_STORAGE,env.CONTROL_P6_USER_B_STORAGE]){
  let s;
  try{s=JSON.parse(read(path,'utf8'));}catch{throw Error('Session-state file unreadable');}
  if(!Array.isArray(s.cookies)||!Array.isArray(s.origins)||!s.cookies.length
    ||!s.origins.every(x=>typeof x.origin==='string'&&x.origin.startsWith('http://127.0.0.1:')))
   throw Error('Invalid isolated browser session state');
  states.push(s);
 }
 if(JSON.stringify(states[0])===JSON.stringify(states[1]))
  throw Error('Browser session files are not independent');
 return {approvedForLocalAcceptance:true,projectRef:env.CONTROL_P7_TEST_PROJECT_REF,
  releaseAuthorized:false,realUserIdentityVerified:false,
  note:'Preflight checks configuration only; real Auth and owner isolation require live test execution'};
}
