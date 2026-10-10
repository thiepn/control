'use client';
import {useEffect,useState} from 'react';
const gates=[
 ['two_user_auth','Independent disposable two-user Auth'],
 ['android_device','Physical Android Chrome'],
 ['ios_device','Physical iOS Safari'],
 ['screen_reader','NVDA and VoiceOver verification'],
 ['offline_recovery','Offline, resume and review conflict'],
 ['privacy_review','Independent privacy and evidence review'],
 ['rollback_rehearsal','Real backup, restore and rollback approval']
] as const;
type Receipt={surface:string;classification:string;source_sha:string};
export default function ReleaseReadinessPanel(){
 const [count,setCount]=useState<number|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{const c=new AbortController();
  fetch('/api/p7/evidence',{cache:'no-store',signal:c.signal})
   .then(r=>{if(!r.ok)throw Error('Receipts unavailable');return r.json();})
   .then((data:{items?:Receipt[]})=>setCount((data.items||[]).filter(
    x=>x.classification==='self_reported_unverified').length))
   .catch(e=>{if(!c.signal.aborted)setError(e instanceof Error?e.message:'Receipt query failed');});
  return()=>c.abort();
 },[]);
 return <section className="p8-readiness" aria-labelledby="p8-release-heading">
   <div className="section-label"><strong id="p8-release-heading">RELEASE DECISION</strong><span>EXPLICIT OPERATOR GATE</span></div>
   <p className="note">No production release is authorized. A passing browser test, a digest receipt or a self-report cannot certify real device, Auth, accessibility or human acceptance. Trusted operator signatures are verified offline and never deploy automatically.</p>
   <ul className="p8-gates">{gates.map(([id,label])=><li key={id}>
    <strong>{label}</strong><span>Open — independent evidence required</span></li>)}</ul>
   <p className="note" role="status" aria-live="polite">
    {error?'Evidence receipt count unavailable; gates remain open.':
    count===null?'Checking receipt metadata…':
    count+' self-reported receipt(s), zero automatically accepted as release approval.'}
   </p>
   <div className="section-label"><strong>OFFLINE CUSTODY &amp; RESTORE</strong><span>P9 REVIEW ONLY</span></div>
   <ul className="p8-gates">
    <li><strong>Exact-head source manifest</strong><span>Automated qualification only — no release certificate</span></li>
    <li><strong>Independent signed custody</strong><span>Open — external operator key and pinned ledger checkpoint required</span></li>
    <li><strong>Reversible backup / restore</strong><span>Runner-local synthetic PostgreSQL only; real disposable staging open</span></li>
   </ul>
   <p className="p8-warning">Release status: NOT AUTHORIZED · No automatic merge, migration, rollback or deployment</p>
 </section>;
}
