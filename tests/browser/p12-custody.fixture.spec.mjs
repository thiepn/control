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
test('P12 physical witness, source rights and recovery gates are clearly uncollected',async({page})=>{
 await page.goto('/p6-fixture-internal');
 const section=page.getByRole('region',{name:'RELEASE DECISION'});
 await expect(section.getByText('P12 — EXTERNAL ACCEPTANCE CUSTODY')).toBeVisible();
 await expect(section.getByText(/P12 RELEASE — DENIED: 16 external prerequisites open/)).toBeVisible();
 await expect(section.getByText('Physical Android, iOS, NVDA and VoiceOver acceptance not collected')).toBeVisible();
 await expect(section.getByText('Independent ownership, privacy and immutable object provenance open')).toBeVisible();
 await expect(section.locator('.p8-gates > li')).toHaveCount(7);
 await expect(section.locator('.p12-gates > li')).toHaveCount(4);
 await expect(section.getByRole('button',{name:/release|publish|merge|migrate|approve|deploy/i})).toHaveCount(0);
});
test('P12 read-only external gates remain legible and never overflow 320px',async({page})=>{
 await page.setViewportSize({width:320,height:720});await page.goto('/p6-fixture-internal');
 await expect(page.getByText('Compromised or rotated signers')).toBeVisible();
 await expect(page.getByText('Recovery and separate-governance builds')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)).toBe(false);
 await page.keyboard.press('Tab');
 await expect(page.getByRole('link',{name:'Skip to main content'})).toBeFocused();
});
