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
   <ul className="p9-gates">
    <li><strong>Exact-head source manifest</strong><span>Automated qualification only — no release certificate</span></li>
    <li><strong>Independent signed custody</strong><span>Open — external operator key and pinned ledger checkpoint required</span></li>
    <li><strong>Reversible backup / restore</strong><span>Runner-local synthetic PostgreSQL only; real disposable staging open</span></li>
   </ul>
   <div className="section-label"><strong>P10 — RELEASE CASE</strong><span>DENIED BY DEFAULT</span></div>
   <p className="note">The operator acceptance handoff remains closed. No genuine A/B Supabase session, physical-device evidence, independent custody chain, real disposable service restore or separate production release command has been approved.</p>
   <ul className="p10-gates" aria-label="P10 independent release evidence status">
    <li><strong>Human acceptance case</strong><span>0 of 7 mandatory gates independently accepted</span></li>
    <li><strong>Executable build comparison</strong><span>Automated CI evidence only — not a production binary certificate</span></li>
    <li><strong>Trusted custody continuity</strong><span>Open — externally anchored signer verification required</span></li>
    <li><strong>Staging and recovery</strong><span>Open — authorized disposable service, physical hardware and real restore required</span></li>
   </ul>
   <p className="p8-warning" role="note">RELEASE CASE — DENIED. Manual acceptance cannot trigger automatic merge, deploy or migration.</p>
   <div className="section-label"><strong>P11 — INDEPENDENT AUDIT</strong><span>EXTERNAL CUSTODY OPEN</span></div>
   <p className="note">Separate GitHub CI workers can compare synthetic executable hashes, but cannot independently approve a physical device, human reviewer, operator signature or real disposable Supabase recovery.</p>
   <ul className="p11-gates" aria-label="P11 independent audit prerequisites">
    <li><strong>Signer rotation and revocation</strong><span>Uncollected — independently pinned, externally witnessed trust records required</span></li>
    <li><strong>Two-worker binary provenance</strong><span>CI synthetic evidence only; production-image acceptance not collected</span></li>
    <li><strong>Disposable recovery</strong><span>Runner-local corruption refusal only; real authorized Supabase restore open</span></li>
    <li><strong>Independent operator closure</strong><span>DENIED — signed human decision and release permission not collected</span></li>
   </ul>
   <div className="section-label"><strong>P12 — EXTERNAL ACCEPTANCE CUSTODY</strong><span>HUMAN ACCEPTANCE OPEN</span></div>
   <p className="note">Verified source hashes, CI-only builders and synthetic reviewer signatures are not evidence that a human operated a physical device, approved rights or witnessed a real Supabase recovery. No operator release is authorized.</p>
   <ul className="p12-gates" aria-label="P12 physical and independent witness release prerequisites">
    <li><strong>Compromised or rotated signers</strong><span>External root and chronology pins not collected</span></li>
    <li><strong>Device and accessibility witnesses</strong><span>Physical Android, iOS, NVDA and VoiceOver acceptance not collected</span></li>
    <li><strong>Source, objects and rights</strong><span>Independent ownership, privacy and immutable object provenance open</span></li>
    <li><strong>Recovery and separate-governance builds</strong><span>Only CI synthetic tests; real disposable restoration and outside builders open</span></li>
   </ul>
   <p className="p8-warning" role="note">P12 RELEASE — DENIED: 16 external prerequisites open; no publish, merge, migration or deployment approval.</p>
   <div className="section-label"><strong>P13 — SEGREGATED EXTERNAL WITNESS INTAKE</strong><span>REVIEW-ONLY</span></div>
   <p className="note">Two signed, independently pinned metadata records and separate owner/auditor acknowledgments cannot establish real device access, copyrighted source ownership, Supabase recovery, independent organizational build custody or release permission.</p>
   <ul className="p13-gates" aria-label="P13 manual release prerequisites">
    <li><strong>Dual-party evidence custody</strong><span>External observer/auditor real-world witness missing</span></li>
    <li><strong>Release role separation</strong><span>Owner and auditor nonrelease review only; human approval missing</span></li>
    <li><strong>Disposable recovery and privacy</strong><span>External authorization and genuine restoration missing</span></li>
    <li><strong>Independent organization builders</strong><span>Only synthetic CI signatures; production image signoff missing</span></li>
   </ul>
   <p className="p8-warning" role="note">P13 RELEASE — DENIED: 18 external prerequisites open; no merge, migration or deployment.</p>
   <div className="section-label"><strong>P14 — HUMAN EVIDENCE RECONCILIATION</strong><span>GATES OPEN</span></div>
   <p className="note">Source and signature consistency are not a substitute for direct human observation, rights-owner permission or independent operator control. Revoked and compromised signers must be requalified outside public CI.</p>
   <ul className="p14-gates" aria-label="P14 independent external acceptance blockers">
    <li><strong>Compromised signer containment</strong><span>Independent reissued custody and trust anchors not collected</span></li>
    <li><strong>Physical accessibility and privacy</strong><span>Android, iOS, NVDA, VoiceOver and rights-owner review not collected</span></li>
    <li><strong>Disposable recovery witness</strong><span>Real authorized Supabase backup and restore not performed</span></li>
    <li><strong>Separately governed production build</strong><span>No outside-organization image custody or production signoff</span></li>
    <li><strong>Pre-cutover operator decision</strong><span>DENY — manual release authorization missing</span></li>
    <li><strong>Postrelease operator decision</strong><span>DENY — independent rollback and recovery approval missing</span></li>
   </ul>
   <p className="p8-warning" role="note">P14 RELEASE — DENIED: 22 human and external prerequisites remain open. No deployment, migration, merge or production rollback is authorized.</p>
   <p className="p8-warning">Release status: NOT AUTHORIZED · No automatic merge, migration, rollback or deployment</p>
 </section>;
}
