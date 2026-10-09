// Runner-local genuine two-transaction PostgreSQL race (not real Supabase Auth).
import {spawn} from 'node:child_process';
const db=process.env.CONTROL_P6_POSTGRES_DB||'control_p6_test';
if(!/^control_p6_[a-z0-9_]+$/.test(db))throw Error('Only disposable P6 PostgreSQL fixture allowed');
function psql(sql){
 return new Promise((resolve,reject)=>{
  const child=spawn('sudo',['-u','postgres','psql','-d',db,'-v','ON_ERROR_STOP=1','-Atc',sql],{stdio:['ignore','pipe','pipe']});
  let out='',err='';
  child.stdout.on('data',v=>{out+=v.toString().slice(0,500)});
  child.stderr.on('data',v=>{err+=v.toString().slice(0,500)});
  child.on('error',reject);
  child.on('close',code=>resolve({code,out:out.trim(),err:err.trim()}));
 });
}
const owner='22222222-2222-4222-8222-222222222222';
const weekSql="date_trunc('week',now() AT TIME ZONE 'Europe/Berlin')::date";
const action=(version,note)=>"SELECT public.control_save_weekly_review('"+owner+"',"+weekSql+","+version+",'draft','"+note+"','','')";
const start=await psql(action(0,'Initial'));
if(start.code!==0)throw Error('P6 baseline draft creation failed');
const results=await Promise.all(['Concurrent A','Concurrent B'].map(v=>psql(action(1,v))));
const winners=results.filter(x=>x.code===0),losers=results.filter(x=>x.code!==0);
if(winners.length!==1||losers.length!==1||!losers[0].err.includes('Review changed or already submitted'))
 throw Error('P6 optimistic review race must produce exactly one winner and one conflict');
const verifySql="SELECT version,wins,(SELECT count(*) FROM public.audit_log WHERE owner_id='"+owner+"' AND action='p5.review.draft') FROM public.control_weekly_reviews WHERE owner_id='"+owner+"' AND week_start="+weekSql;
const verified=await psql(verifySql);
if(verified.code!==0||!/^2\|(Concurrent A|Concurrent B)\|2$/.test(verified.out))
 throw Error('P6 winning draft not durable or audit inconsistent');
console.log('PASS P6: parallel PostgreSQL transactions, single winner, stale conflict, durable version and audit');
