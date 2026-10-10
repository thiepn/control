import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.route('**/api/operations/**',async route=>{
  const u=new URL(route.request().url());
  let data={page:0,hasMore:false,entries:[]};
  if(u.pathname.endsWith('/overview'))data={summary:{asOf:'2026-10-10',week:'2026-10-05',
   projects:{total:0,byState:{},overdue:0,approaching:0,hardDeadlines:0,
    missingNextAction:0,blockedLifecycle:0,blockedPhaseProjects:0},
   milestones:{total:0,reported:0,verified:0,unverified:0},
   focus:{selected:0,capacity:3},reviews:{submittedCount:0,currentWeekSubmitted:false},
   evidence:{observed:0,latestObservedAt:null},methodology:'Synthetic only'},integrations:[]};
  if(u.pathname.endsWith('/reviews'))data={reviews:[],thisWeek:'2026-10-05'};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.route('**/api/p7/evidence',route=>route.fulfill({status:200,
  contentType:'application/json',body:JSON.stringify({items:[]})}));
});
test('P13 signed claims never promote manual release status or collapse P8 gates',async({page})=>{
 await page.goto('/p6-fixture-internal');
 const region=page.getByRole('region',{name:'RELEASE DECISION'});
 await expect(region.getByText('P13 — SEGREGATED EXTERNAL WITNESS INTAKE')).toBeVisible();
 await expect(region.getByText(/P13 RELEASE — DENIED: 18 external prerequisites open/)).toBeVisible();
 await expect(region.getByText('External observer/auditor real-world witness missing')).toBeVisible();
 await expect(region.getByText('Owner and auditor nonrelease review only; human approval missing')).toBeVisible();
 await expect(region.locator('.p8-gates > li')).toHaveCount(7);
 await expect(region.locator('.p13-gates > li')).toHaveCount(4);
 await expect(region.getByRole('button',{name:/release|approve|deploy|merge|migrate|publish/i})).toHaveCount(0);
});
test('P13 review-only custody and missing approvals readable on 320px mobile',async({page})=>{
 await page.setViewportSize({width:320,height:720});
 await page.goto('/p6-fixture-internal');
 await expect(page.getByText('Dual-party evidence custody')).toBeVisible();
 await expect(page.getByText('Independent organization builders')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)).toBe(false);
 await page.keyboard.press('Tab');
 await expect(page.getByRole('link',{name:'Skip to main content'})).toBeFocused();
});
