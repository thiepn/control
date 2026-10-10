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
test('P17 review only preserves all seven P8 real human gates and denies original evidence promotion',async({page})=>{
 await page.goto('/p6-fixture-internal');
 const region=page.getByRole('region',{name:'RELEASE DECISION'});
 await expect(region.getByText('P17 — FROZEN CANDIDATE & INDEPENDENT WITNESSES')).toBeVisible();
 await expect(region.getByText('Externally governed reissue and new independent keys NOT COLLECTED')).toBeVisible();
 await expect(region.getByText('Genuine original-byte Supabase backup, restore and witness NOT COLLECTED')).toBeVisible();
 await expect(region.getByText(/P17 RELEASE — DENIED: 42 external prerequisites OPEN/)).toBeVisible();
 await expect(region.locator('.p8-gates > li')).toHaveCount(7);
 await expect(region.locator('.p17-gates > li')).toHaveCount(7);
 await expect(region.getByRole('button',{name:/approve|release|deploy|merge|migrate|restore|rollback/i})).toHaveCount(0);
});
test('P17 physical, rights and image signoff remain legible on 320px and keyboard skip works',async({page})=>{
 await page.setViewportSize({width:320,height:720});await page.goto('/p6-fixture-internal');
 await expect(page.getByText('Consent and original rights adjudication')).toBeVisible();
 await expect(page.getByText('NVDA and VoiceOver originals')).toBeVisible();
 await expect(page.getByText('Frozen production image custody')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)).toBe(false);
 await page.keyboard.press('Tab');
 await expect(page.getByRole('link',{name:'Skip to main content'})).toBeFocused();
});
