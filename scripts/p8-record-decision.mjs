// Offline operator decision record: local path outside repo, atomic append, no release APIs.
import {readFileSync,writeFileSync,renameSync,mkdirSync,rmdirSync,existsSync,realpathSync,openSync,closeSync} from 'node:fs';
import {dirname,resolve,relative,isAbsolute} from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {emptyLedger,reviewOperatorDecision,verifyLedger} from '../src/lib/p8-decision.mjs';
export function recordOfflineDecision({attestation,signature,publicKeyPem,sourceSha,
 artifactSha,now,ledgerPath}){
 if(!isAbsolute(ledgerPath||''))throw Error('Ledger path must be absolute and outside repository');
 const root=realpathSync(process.cwd()),target=resolve(ledgerPath);
 const diff=relative(root,target);
 if(!diff||(!diff.startsWith('..')&&!isAbsolute(diff)))
  throw Error('Operator evidence ledger cannot be stored inside public repository');
 const parent=realpathSync(dirname(target));
 const lock=target+'.lock';
 mkdirSync(lock); // fail closed if concurrent or crashed writer; never remove someone else's lock
 try{
  let ledger=emptyLedger();
  if(existsSync(target))ledger=JSON.parse(readFileSync(target,'utf8'));
  verifyLedger(ledger);
  const decision=reviewOperatorDecision({attestation,signature,publicKeyPem,sourceSha,
   artifactSha,now,ledger});
  if(!decision.recordable)throw Error('Operator decision denied: '+decision.reasons.join('; '));
  const next={schema:'control-p8-ledger-v1',entries:[...ledger.entries,decision.entry]};
  verifyLedger(next);
  const tmp=resolve(parent,'.p8-operator-'+randomUUID()+'.tmp');
  let fd;
  try{
   fd=openSync(tmp,'wx',0o600);
   writeFileSync(fd,JSON.stringify(next,null,2)+'\n',{encoding:'utf8'});
   closeSync(fd);fd=undefined;
   renameSync(tmp,target);
  }finally{
   if(fd!==undefined)closeSync(fd);
  }
  return {recorded:true,entry_sha256:decision.entry.entry_sha256,releaseAuthorized:false,deploymentAuthorized:false};
 }finally{rmdirSync(lock);}
}
if(process.argv[1]?.endsWith('p8-record-decision.mjs')){
 const env=process.env;
 for(const name of ['P8_OPERATOR_ATTESTATION_FILE','P8_OPERATOR_SIGNATURE_FILE',
  'P8_TRUSTED_OPERATOR_PUBLIC_KEY_FILE','P8_LEDGER_PATH','P8_EXPECTED_ARTIFACT_SHA256',
  'P8_EXPECTED_HEAD'])
  if(!env[name])throw Error('Missing external operator input: '+name);
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(head!==env.P8_EXPECTED_HEAD)throw Error('Exact reviewed source head mismatch');
 const result=recordOfflineDecision({
  attestation:JSON.parse(readFileSync(env.P8_OPERATOR_ATTESTATION_FILE,'utf8')),
  signature:readFileSync(env.P8_OPERATOR_SIGNATURE_FILE,'utf8').trim(),
  publicKeyPem:readFileSync(env.P8_TRUSTED_OPERATOR_PUBLIC_KEY_FILE,'utf8'),
  ledgerPath:env.P8_LEDGER_PATH,sourceSha:head,artifactSha:env.P8_EXPECTED_ARTIFACT_SHA256,
  now:new Date().toISOString()
 });
 console.log('Offline decision recorded; entry digest '+result.entry_sha256+
  '. No merge, migration, release or deployment authorization granted.');
}
