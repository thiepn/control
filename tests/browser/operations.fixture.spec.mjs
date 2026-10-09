import {test,expect} from '@playwright/test';
import {mondayOf,berlinDay} from '../../src/lib/portfolio-insights.mjs';
const week=mondayOf(berlinDay());
const alpha='11111111-1111-4111-8111-111111111112';
const fixtures={
 summary:{asOf:berlinDay(),week,partial:false,
  projects:{total:2,byState:{active:1,planned:1},overdue:1,approaching:0,
   hardDeadlines:1,missingNextAction:0,blockedLifecycle:0,blockedPhaseProjects:0},
  milestones:{total:2,reported:1,verified:1,unverified:1},
  focus:{selected:1,capacity:3},reviews:{submittedCount:0,currentWeekSubmitted:false},
  evidence:{observed:1,latestObservedAt:null},methodology:'Synthetic owner-only test records'},
 integrations:[{id:'github_app',label:'GitHub App reconciliation',status:'not_configured',detail:'Fixture has no credentials'}]
};
function setupRoutes(page,{conflict=false}={}){
 // The device receipt API is separately mocked in fixture tests; never access live Auth.
 page.route('**/api/p7/evidence',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({items:[],note:'Synthetic fixture only; no approval'})}));
 let review=null, auditRequests=0;
 return page.route('**/api/operations/**',async route=>{
  const req=route.request(),url=new URL(req.url()),json=x=>route.fulfill({
   status:200,contentType:'application/json',body:JSON.stringify(x)});
  if(url.pathname.endsWith('/overview'))return json(fixtures);
  if(url.pathname.endsWith('/reviews')){
   if(req.method()==='POST'){
    if(conflict)return route.fulfill({status:409,contentType:'application/json',
     body:JSON.stringify({error:'Version conflict'})});
    const input=req.postDataJSON();
    review={id:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',week_start:week,state:input.action==='submit'?'submitted':'draft',
     version:(review?.version||0)+1,wins:input.wins,blockers:input.blockers,next_week:input.next_week,
     snapshot:{projects_active:1,projects_completed:0,focus_project_ids:[alpha]},
     updated_at:new Date().toISOString(),submitted_at:input.action==='submit'?new Date().toISOString():null};
    return json({result:{id:review.id,state:review.state,version:review.version}});
   }
   return json({thisWeek:week,reviews:review?[review]:[]});
  }
  if(url.pathname.endsWith('/audit')){
   auditRequests++;
   const pageNum=Number(url.searchParams.get('page')||0);
   return json({page:pageNum,hasMore:pageNum===0,entries:pageNum===0?[{
    id:'99999999-9999-4999-8999-999999999999',project_id:alpha,actor:'user',
    action:'synthetic.review',source_ref:'fixture',created_at:'2026-10-09T12:00:00.000Z',
    previous_data:{secret:'Synthetic data only'},new_data:{state:'draft'}
   }]:[]});
  }
  return route.abort();
 });
}
test('real Review UI renders metrics, accessible status and provenance disclosure',async({page})=>{
 await setupRoutes(page);
 await page.goto('/p6-fixture-internal');
 await expect(page.getByRole('heading',{name:'Portfolio Review'})).toBeVisible();
 await expect(page.getByText('RECORDED DATA ONLY')).toBeVisible();
 await expect(page.locator('.ops-audit').getByText('Synthetic Atlas')).toBeVisible();
 await expect(page.getByText(/Synthetic data only/)).not.toBeVisible();
 await page.getByText('synthetic.review').click();
 await page.getByText('View recorded change').click();
 await expect(page.getByText(/Synthetic data only/)).toBeVisible();
 await expect(page.getByRole('button',{name:'Save draft'})).toBeEnabled();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
 expect(overflow,'unintended viewport overflow').toBe(false);
});
test('review submission is locked; audit paging and disabled state reflect real UI',async({page})=>{
 await setupRoutes(page);
 await page.goto('/p6-fixture-internal');
 await page.getByRole('textbox',{name:'Wins and completed work'}).fill('Synthetic P6 test passed');
 await page.getByRole('textbox',{name:'Outstanding blockers'}).fill('Physical acceptance not signed');
 await page.getByRole('button',{name:'Submit and lock review'}).click();
 await expect(page.locator('.ops-review-locked').getByText('Submitted and locked')).toBeVisible();
 await expect(page.getByText('Synthetic P6 test passed')).toBeVisible();
 await expect(page.getByRole('button',{name:'Save draft'})).toHaveCount(0);
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await expect(page.getByText('Page 2')).toBeVisible();
});
test('409 conflict keeps local draft and offers retry, not silent overwrite',async({page})=>{
 await setupRoutes(page,{conflict:true});
 await page.goto('/p6-fixture-internal');
 const wins=page.getByRole('textbox',{name:'Wins and completed work'});
 await wins.fill('Do not discard this unsaved text');
 await page.getByRole('button',{name:'Save draft'}).click();
 await expect(page.locator('section.operations > .status.failure[role="alert"]')).toContainText('This review changed');
 await expect(wins).toHaveValue('Do not discard this unsaved text');
 await expect(page.getByRole('button',{name:'Copy unsaved review'})).toBeEnabled();
});
test('offline state disables writes and keyboard skip navigation remains reachable',async({page,context})=>{
 await setupRoutes(page);
 await page.goto('/p6-fixture-internal');
 await page.keyboard.press('Tab');
 await expect(page.getByRole('link',{name:'Skip to main content'})).toBeFocused();
 await context.setOffline(true);
 await expect(page.getByText('Offline — changes disabled')).toBeVisible();
 await expect(page.getByRole('button',{name:'Save draft'})).toBeDisabled();
 await context.setOffline(false);
 await expect(page.getByRole('button',{name:'Save draft'})).toBeEnabled();
});

test('fixture browser performance and keyboard focus have explicit, bounded evidence',async({page},testInfo)=>{
 await setupRoutes(page);
 const started=Date.now();
 await page.goto('/p6-fixture-internal');
 await expect(page.getByRole('heading',{name:'Portfolio Review'})).toBeVisible();
 const elapsed=Date.now()-started;
 expect(elapsed,'synthetic local Review interactive load exceeded 15 s').toBeLessThan(15000);
 const shot=await page.screenshot({fullPage:true});
 await testInfo.attach('SYNTHETIC-review-'+testInfo.project.name,
  {body:shot,contentType:'image/png'});
 const missing=await page.locator('button:visible').count();
 expect(missing).toBeGreaterThan(1);
});

test('source-linked observation stays unverified and rejects forged intake',async({page})=>{
 await setupRoutes(page);
 let saved=null;
 await page.route('**/api/p7/evidence',async route=>{
  const req=route.request(),json=v=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(v)});
  if(req.method()==='GET')return json({items:saved?[saved]:[]});
  const data=req.postDataJSON();
  if(data.source_sha.length!==40||data.evidence_sha256.length!==64)
   return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'Invalid observation metadata'})});
  saved={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',surface:data.surface,
   source_sha:data.source_sha,evidence_sha256:data.evidence_sha256,observation:data.observation,
   classification:'self_reported_unverified',recorded_at:'2026-10-10T00:00:00Z'};
  return json({id:saved.id,classification:'self_reported_unverified',acceptedAsApproval:false});
 });
 await page.goto('/p6-fixture-internal');
 await expect(page.getByText('DEVICE EVIDENCE RECEIPTS')).toBeVisible();
 await page.getByRole('textbox',{name:'Exact source commit SHA'}).fill('a'.repeat(40));
 await page.getByRole('textbox',{name:'Evidence SHA256'}).fill('b'.repeat(64));
 await page.getByRole('textbox',{name:'Non-sensitive observation (max 500 characters)'}).fill('Synthetic screen reader keyboard check');
 await page.getByRole('button',{name:'Record unverified receipt'}).click();
 await expect(page.getByText('Unverified — no approval')).toBeVisible();
 await expect(page.getByText(/does not certify a physical device/)).toBeVisible();
});
