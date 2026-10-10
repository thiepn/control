import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.route('**/api/operations/**',async route=>{
  const u=new URL(route.request().url());let data={page:0,hasMore:false,entries:[]};
  if(u.pathname.endsWith('/overview'))data={summary:{asOf:'2026-10-10',week:'2026-10-05',
   projects:{total:0,byState:{},overdue:0,approaching:0,hardDeadlines:0,
    missingNextAction:0,blockedLifecycle:0,blockedPhaseProjects:0},
   milestones:{total:0,reported:0,verified:0,unverified:0},focus:{selected:0,capacity:3},
   reviews:{submittedCount:0,currentWeekSubmitted:false},
   evidence:{observed:0,latestObservedAt:null},methodology:'Synthetic only'},integrations:[]};
  if(u.pathname.endsWith('/reviews'))data={reviews:[],thisWeek:'2026-10-05'};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.route('**/api/p7/evidence',route=>route.fulfill({status:200,
  contentType:'application/json',body:JSON.stringify({items:[]})}));
});
test('P14 denies pre and post release despite synthetic signed source evidence',async({page})=>{
 await page.goto('/p6-fixture-internal');
 const region=page.getByRole('region',{name:'RELEASE DECISION'});
 await expect(region.getByText('P14 — HUMAN EVIDENCE RECONCILIATION')).toBeVisible();
 await expect(region.getByText('DENY — manual release authorization missing')).toBeVisible();
 await expect(region.getByText('DENY — independent rollback and recovery approval missing')).toBeVisible();
 await expect(region.getByText(/P14 RELEASE — DENIED: 22 human and external prerequisites/)).toBeVisible();
 await expect(region.locator('.p8-gates > li')).toHaveCount(7);
 await expect(region.locator('.p14-gates > li')).toHaveCount(6);
 await expect(region.getByRole('button',{name:/approve|release|deploy|merge|migrate|rollback/i})).toHaveCount(0);
});
test('P14 rights, device and signer blockers visible at 320px with keyboard focus',async({page})=>{
 await page.setViewportSize({width:320,height:720});await page.goto('/p6-fixture-internal');
 await expect(page.getByText('Compromised signer containment')).toBeVisible();
 await expect(page.getByText('Physical accessibility and privacy')).toBeVisible();
 await expect(page.getByText('Separately governed production build')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)).toBe(false);
 await page.keyboard.press('Tab');
 await expect(page.getByRole('link',{name:'Skip to main content'})).toBeFocused();
});
