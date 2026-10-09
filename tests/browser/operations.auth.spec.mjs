import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
// Must run scripts/p6-auth-preflight.mjs first. Genuine sessions only, NEVER fixture gate.
test('two independently authenticated browser accounts and revocation',async({browser})=>{
 test.skip(process.env.CONTROL_TEST_DISPOSABLE!=='I_ACKNOWLEDGE_DISPOSABLE_PROJECT',
  'Real two-user Supabase sessions unavailable');
 const baseURL='http://127.0.0.1:3138';
 const a=await browser.newContext({baseURL,storageState:process.env.CONTROL_P6_USER_A_STORAGE});
 const b=await browser.newContext({baseURL,storageState:process.env.CONTROL_P6_USER_B_STORAGE});
 let project=null;
 try{
  const pa=await a.newPage(),pb=await b.newPage();
  await Promise.all([pa.goto('/'),pb.goto('/')]);
  await expect(pa.getByRole('navigation',{name:'Main navigation'})).toBeVisible();
  await expect(pb.getByRole('navigation',{name:'Main navigation'})).toBeVisible();
  const title='P6 disposable acceptance '+randomUUID().slice(0,12);
  const slug='p6-acceptance-'+randomUUID().slice(0,12);
  const created=await a.request.post('/api/projects',{
   headers:{Origin:baseURL,'Sec-Fetch-Site':'same-origin'},
   data:{title,slug,lifecycle:'inbox'}});
  expect(created.status()).toBe(201);
  project=(await created.json()).item;
  const [owner,other]=await Promise.all([a.request.get('/api/projects'),b.request.get('/api/projects')]);
  expect(owner.ok()).toBe(true);expect(other.ok()).toBe(true);
  expect((await owner.json()).items.some(x=>x.id===project.id)).toBe(true);
  expect((await other.json()).items.some(x=>x.id===project.id)).toBe(false);
  const foreign=await b.request.patch('/api/projects/'+project.id,{
   headers:{Origin:baseURL,'Sec-Fetch-Site':'same-origin','If-Match':String(project.version)},
   data:{title:'Unauthorized edit'}});
  expect(foreign.ok()).toBe(false);
  const forgedOrigin=await a.request.patch('/api/projects/'+project.id,{
   headers:{Origin:'https://untrusted.invalid','If-Match':String(project.version)},
   data:{title:'Forged origin edit'}});
  expect(forgedOrigin.status()).toBe(403);
  const [ownerAudit,otherAudit]=await Promise.all([
   a.request.get('/api/operations/audit?page=0&project='+project.id),
   b.request.get('/api/operations/audit?page=0&project='+project.id)]);
  expect(ownerAudit.ok()).toBe(true);expect(otherAudit.ok()).toBe(true);
  expect((await ownerAudit.json()).entries.length).toBeGreaterThan(0);
  expect((await otherAudit.json()).entries.length).toBe(0);
  // Same owner, two real browser contexts: two writes with the same expected version
  // must have exactly one persisted winner and one stale conflict.
  const secondDevice=await browser.newContext({
   baseURL,storageState:process.env.CONTROL_P6_USER_A_STORAGE});
  try{
   const version=project.version;
   const outcomes=await Promise.all(['Physical-device-A','Physical-device-B'].map((next_action,i)=>
    (i===0?a:secondDevice).request.patch('/api/projects/'+project.id,{
     headers:{Origin:baseURL,'Sec-Fetch-Site':'same-origin','If-Match':String(version)},
     data:{next_action}
    })));
   const passed=outcomes.filter(x=>x.status()===200),conflicts=outcomes.filter(x=>x.status()===409);
   expect(passed.length).toBe(1);expect(conflicts.length).toBe(1);
   project=(await passed[0].json()).item;
   expect(project.version).toBe(version+1);
   const check=await a.request.get('/api/projects');
   expect(check.ok()).toBe(true);
   const persisted=(await check.json()).items.find(x=>x.id===project.id);
   expect(persisted.version).toBe(project.version);
   expect(persisted.next_action).toBe(project.next_action);
  }finally{await secondDevice.close();}
  // Genuine Auth logout from user B; clearing cookies alone is not a server revocation test.
  await pb.getByRole('button',{name:/Sign out/}).click();
  await pb.waitForLoadState('networkidle');

  await expect(pb.getByRole('navigation',{name:'Main navigation'})).toHaveCount(0);
  expect((await b.request.get('/api/projects')).status()).toBe(401);
 }finally{
  if(project){
   const cleaned=await a.request.delete('/api/projects/'+project.id,{
    headers:{Origin:baseURL,'Sec-Fetch-Site':'same-origin','If-Match':String(project.version)}});
   expect(cleaned.ok()).toBe(true);
  }
  await Promise.all([a.close(),b.close()]);
 }
});
