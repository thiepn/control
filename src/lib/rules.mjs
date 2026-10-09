export const lifecycles = Object.freeze(['inbox','planned','active','waiting','paused','completed','archived']);
export const priorities = Object.freeze(['P0','P1','P2','P3']);
export function parseProject(value,{create=false}={}) {
 if (!value || typeof value!=='object' || Array.isArray(value)) throw Error('Expected object');
 const allowed=new Set(['title','slug','summary','category','lifecycle','priority','deadline_date','deadline_kind','next_action']);
 for(const key of Object.keys(value)) if(!allowed.has(key)) throw Error(`Forbidden field: ${key}`);
 if(create && (!value.title || !value.slug)) throw Error('Title and slug required');
 const out={};
 for(const key of Object.keys(value)) {
  const v=value[key];
  if (key==='priority') { if(v!==null&&!priorities.includes(v)) throw Error('Priority invalid'); }
  else if(key==='lifecycle') { if(!lifecycles.includes(v)) throw Error('Lifecycle invalid'); }
  else if(key==='deadline_date') { if(v!==null && (typeof v!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v+'T00:00:00Z')) || new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)) throw Error('Deadline invalid'); }
  else if(key==='deadline_kind') { if(v!==null&&!['hard','target'].includes(v)) throw Error('Deadline kind invalid'); }
  else if(key==='slug') { if(typeof v!=='string'||! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)||v.length>80) throw Error('Slug invalid'); }
  else if(key==='title') { if(typeof v!=='string'||v.trim().length===0||v.length>160) throw Error('Title invalid'); }
  else if(v!==null && (typeof v!=='string'||v.length>2000)) throw Error(`${key} invalid`);
  out[key]=typeof v==='string'?v.trim():v;
 }
 if((out.deadline_date===null || out.deadline_kind===null) && (out.deadline_date!==undefined||out.deadline_kind!==undefined)){
  out.deadline_date=null;out.deadline_kind=null;
 }
 if (create && !!out.deadline_date!==!!out.deadline_kind) throw Error('Deadline and kind must be paired');
 return out;
}
export function assertFocus(ids){
 if(!Array.isArray(ids)||ids.length>3||new Set(ids).size!==ids.length||ids.some(x=>typeof x!=='string'||!/^[a-f0-9-]{36}$/i.test(x))) throw Error('Choose 0–3 distinct projects');
 return ids;
}
export function weekStart(date = new Date(), timeZone = 'Europe/Berlin') {
 const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
  timeZone, year:'numeric', month:'2-digit', day:'2-digit'
 }).formatToParts(date).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 const monday = new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day)));
 monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7));
 return monday.toISOString().slice(0,10);
}
export function orderProjects(rows,sort='manual') {
 const a=[...rows];
 const priority = p=> ['P0','P1','P2','P3'].indexOf(p.priority);
 const n = p => p.manual_rank ?? Number.MAX_SAFE_INTEGER;
 a.sort((x,y)=>sort==='priority'?(priority(x)===-1?99:priority(x))-(priority(y)===-1?99:priority(y))||n(x)-n(y):sort==='deadline'?(x.deadline_date||'9999').localeCompare(y.deadline_date||'9999')||n(x)-n(y):sort==='title'?x.title.localeCompare(y.title):n(x)-n(y));
 return a;
}
