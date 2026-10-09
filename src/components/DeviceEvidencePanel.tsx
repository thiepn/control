'use client';
import {useEffect,useState} from 'react';
type Item={id:string;surface:string;source_sha:string;evidence_sha256:string;
 observation:string;classification:string;recorded_at:string};
const types=[
 ['android_chrome','Android Chrome'],['ios_safari','iOS Safari'],
 ['nvda','NVDA screen reader'],['voiceover','VoiceOver'],
 ['two_device','Two-device session'],['offline_recovery','Offline recovery'],
 ['rollback','Rollback rehearsal']
] as const;
export default function DeviceEvidencePanel(){
 const [items,setItems]=useState<Item[]>([]);
 const [surface,setSurface]=useState<string>('android_chrome');
 const [head,setHead]=useState(''),[digest,setDigest]=useState(''),[note,setNote]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('');
 const load=async()=>{
  const r=await fetch('/api/p7/evidence',{cache:'no-store'});
  if(!r.ok)throw Error('Device receipt service unavailable');
  const v=await r.json();setItems(v.items||[]);
 };
 useEffect(()=>{load().catch(e=>setError(e instanceof Error?e.message:'Receipt list unavailable'));},[]);
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();if(busy)return;
  setBusy(true);setError('');setStatus('');
  try{
   const r=await fetch('/api/p7/evidence',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({surface,source_sha:head.trim(),evidence_sha256:digest.trim(),
      observation:note.trim()})});
   const v=await r.json();
   if(!r.ok)throw Error(v.error||'Receipt not recorded');
   await load();setNote('');
   setStatus('Unverified observation received. This does not certify a physical device or authorize release.');
  }catch(ex){setError(ex instanceof Error?ex.message:'Receipt failed; entered details preserved.');}
  finally{setBusy(false);}
 };
 return <section className="p7-evidence" aria-labelledby="p7-receipts-title">
  <div className="section-label"><strong id="p7-receipts-title">DEVICE EVIDENCE RECEIPTS</strong><span>UNVERIFIED METADATA ONLY</span></div>
  <p className="note">Record only a SHA256 digest of evidence kept separately in an approved private location. Never paste screenshots, cookies, credentials, device identifiers or personal data. A receipt cannot approve a release.</p>
  <form className="p7-evidence-form" onSubmit={submit}>
   <label>Test surface
    <select value={surface} onChange={e=>setSurface(e.target.value)}>
     {types.map(([value,label])=><option key={value} value={value}>{label}</option>)}
    </select>
   </label>
   <label>Exact source commit SHA
    <input required pattern="[a-f0-9]{40}" maxLength={40} autoComplete="off"
      value={head} onChange={e=>setHead(e.target.value)} placeholder="40 lowercase hexadecimal characters"/>
   </label>
   <label>Evidence SHA256
    <input required pattern="[a-f0-9]{64}" maxLength={64} autoComplete="off"
      value={digest} onChange={e=>setDigest(e.target.value)} placeholder="64 lowercase hexadecimal characters"/>
   </label>
   <label>Non-sensitive observation (max 500 characters)
    <textarea required maxLength={500} rows={2} value={note} onChange={e=>setNote(e.target.value)}
      placeholder="Describe what was checked; do not claim independent signoff."/>
   </label>
   <div className="ops-actions"><button type="submit" disabled={busy}>Record unverified receipt</button>
    <button type="button" disabled={busy} onClick={()=>load().catch(e=>setError(String(e)))}>Refresh receipts</button>
   </div>
  </form>
  <p role="status" aria-live="polite">{status}</p>
  {error&&<p className="status failure" role="alert">{error}</p>}
  {!items.length&&<p className="empty">No receipt metadata recorded for this owner.</p>}
  <div className="p7-receipt-list">{items.map(v=><article key={v.id} className="p7-receipt">
    <strong>{types.find(([key])=>key===v.surface)?.[1]||v.surface}</strong>
    <span className="p7-unverified">Unverified — no approval</span>
    <p>Head: <code>{v.source_sha.slice(0,12)}</code> · SHA256: <code>{v.evidence_sha256.slice(0,12)}</code></p>
    <p>{v.observation}</p><small>Recorded {new Date(v.recorded_at).toLocaleDateString()}</small>
   </article>)}</div>
 </section>;
}
