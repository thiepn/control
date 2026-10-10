import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.route('**/api/operations/**',async route=>{
  const url=new URL(route.request().url());
  let out={page:0,hasMore:false,entries:[]};
  if(url.pathname.endsWith('/overview'))
   out={summary:{asOf:'2026-10-10',week:'2026-10-05',
    projects:{total:0,byState:{},overdue:0,approaching:0,hardDeadlines:0,missingNextAction:0,
     blockedLifecycle:0,blockedPhaseProjects:0},milestones:{total:0,reported:0,verified:0,unverified:0},
    focus:{selected:0,capacity:3},reviews:{submittedCount:0,currentWeekSubmitted:false},
    evidence:{observed:0,latestObservedAt:null},methodology:'Synthetic only'},integrations:[]};
  if(url.pathname.endsWith('/reviews'))out={reviews:[],thisWeek:'2026-10-05'};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out)});
 });
 await page.route('**/api/p7/evidence',route=>route.fulfill({status:200,
  contentType:'application/json',body:JSON.stringify({items:[]})}));
});
test('P10 release case explicitly denies production while preserving all P8 gates',async({page})=>{
 await page.goto('/p6-fixture-internal');
 const section=page.getByRole('region',{name:'RELEASE DECISION'});
 await expect(section.getByText('P10 — RELEASE CASE')).toBeVisible();
 await expect(section.getByText('0 of 7 mandatory gates independently accepted')).toBeVisible();
 await expect(section.getByText(/RELEASE CASE — DENIED/)).toBeVisible();
 await expect(section.locator('.p8-gates > li')).toHaveCount(7);
 await expect(section.locator('.p10-gates > li')).toHaveCount(4);
 await expect(section.getByRole('button',{name:/approve|deploy|merge|migrate/i})).toHaveCount(0);
});
test('P10 release case remains accessible and visible on narrow mobile',async({page})=>{
 await page.setViewportSize({width:320,height:720});await page.goto('/p6-fixture-internal');
 await expect(page.getByText('Trusted custody continuity')).toBeVisible();
 await expect(page.getByText('RELEASE CASE — DENIED. Manual acceptance cannot trigger automatic merge, deploy or migration.')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)).toBe(false);
});
