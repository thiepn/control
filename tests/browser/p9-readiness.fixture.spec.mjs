import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.route('**/api/operations/**',r=>r.fulfill({status:200,contentType:'application/json',
  body:JSON.stringify({summary:{asOf:'2026-10-10',week:'2026-10-05',
   projects:{total:0,byState:{},overdue:0,approaching:0,hardDeadlines:0,missingNextAction:0,
    blockedLifecycle:0,blockedPhaseProjects:0},milestones:{total:0,reported:0,verified:0,unverified:0},
   focus:{selected:0,capacity:3},reviews:{submittedCount:0,currentWeekSubmitted:false},
   evidence:{observed:0,latestObservedAt:null},methodology:'Synthetic'},integrations:[],reviews:[],
   thisWeek:'2026-10-05',entries:[],page:0,hasMore:false})}));
 await page.route('**/api/p7/evidence',r=>r.fulfill({status:200,contentType:'application/json',
  body:JSON.stringify({items:[]})}));
});
test('P9 custody and real staging stay open on synthetic release workspace',async({page})=>{
 await page.goto('/p6-fixture-internal');
 const section=page.getByRole('region',{name:'RELEASE DECISION'});
 await expect(section.getByText('OFFLINE CUSTODY & RESTORE')).toBeVisible();
 await expect(section.getByText('Open — external operator key and pinned ledger checkpoint required')).toBeVisible();
 await expect(section.getByText('Runner-local synthetic PostgreSQL only; real disposable staging open')).toBeVisible();
 await expect(section.getByText('Release status: NOT AUTHORIZED')).toBeVisible();
 await expect(section.getByRole('button',{name:/approve|deploy|merge/i})).toHaveCount(0);
});
test('P9 evidence disclosures remain visible at narrow mobile width',async({page})=>{
 await page.setViewportSize({width:320,height:720});await page.goto('/p6-fixture-internal');
 await expect(page.getByText('Exact-head source manifest')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)).toBe(false);
});
