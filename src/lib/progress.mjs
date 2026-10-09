/**
 * Explicitly separates self-reported work from verifiable completion.
 * No zero or 100 percent is invented when milestones have not been defined.
 */
export function aggregateProgress(milestones) {
  if (!Array.isArray(milestones) || milestones.length===0) {
    return {reported:null,verified:null,fullyVerified:false,unassessed:true};
  }
  let total=0,reported=0,verified=0;
  for (const item of milestones) {
    const w=Number(item.weight), f=Number(item.completion_fraction ?? 0);
    if (!Number.isFinite(w)||w<=0||!Number.isFinite(f)||f<0||f>1)
      throw new Error('Invalid milestone weighting or fraction');
    total+=w;
    if(item.evidence_grade==='user_reported'||item.evidence_grade==='verified')reported+=w*f;
    if(item.evidence_grade==='verified'&&item.verified_at&&item.verified_by
       &&(item.release_gate==='none'||item.gate_passed===true)) verified+=w*f;
  }
  const pct=x=>Math.round(x/total*1000)/10;
  const fullyVerified=milestones.every(x=>x.evidence_grade==='verified'&&x.verified_at&&x.verified_by
    &&Number(x.completion_fraction)===1
    &&(x.release_gate==='none'||x.gate_passed===true));
  return {reported:pct(reported),verified:pct(verified),fullyVerified,unassessed:false};
}
export function deadlineSignal(date,today) {
  if(!date)return 'none';
  if(!/^\d{4}-\d\d-\d\d$/.test(date)||!/^\d{4}-\d\d-\d\d$/.test(today))throw Error('Invalid date');
  const days=Math.round((Date.parse(date+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);
  return days<0?'overdue':days<=7?'upcoming':'scheduled';
}
