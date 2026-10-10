import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.route('**/api/operations/**',async route=>{
  const url=new URL(route.request().url());
  let value={};
  if(url.pathname.endsWith('overview'))value={summary:{
   asOf:'2026-10-10',week:'2026-10-05',projects:{total:0,byState:{},overdue:0,approaching:0,hardDeadlines:0,missingNextAction:0,blockedLifecycle:0,blockedPhaseProjects:0},
   milestones:{total:0,reported:0,verified:0,unverified:0},focus:{selected:0,capacity:3},
   reviews:{submittedCount:0,currentWeekSubmitted:false},evidence:{observed:0,latestObservedAt:null},
   methodology:'Synthetic fixture only'},integrations:[]};
  else if(url.pathname.endsWith('reviews'))value={reviews:[],thisWeek:'2026-10-05'};
  else value={page:0,hasMore:false,entries:[]};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});
 });
 await page.route('**/api/p7/evidence',route=>route.fulfill({status:200,contentType:'application/json',
  body:JSON.stringify({items:[{surface:'nvda',classification:'self_reported_unverified',source_sha:'a'.repeat(40)}]})}));
});
test('receipt never promotes gate, and no release/deploy button is present',async({page})=>{
 await page.goto('/p6-fixture-internal');
 await expect(page.getByText('RELEASE DECISION')).toBeVisible();
 await expect(page.getByText('1 self-reported receipt(s), zero automatically accepted as release approval.')).toBeVisible();
 await expect(page.locator('.p8-gates > li')).toHaveCount(7);
 await expect(page.getByText('Release status: NOT AUTHORIZED')).toBeVisible();
 await expect(page.getByRole('button',{name:/deploy|merge|approve release/i})).toHaveCount(0);
});
test('320px touch accessibility keeps visible labels and no horizontal overflow',async({page})=>{
 await page.setViewportSize({width:320,height:720});
 await page.goto('/p6-fixture-internal');
 const section=page.getByRole('region',{name:'Release decision and acceptance gates'});
 await expect(section).toBeVisible();
 await expect(section.getByText('Physical Android Chrome')).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
 expect(overflow).toBe(false);
});
