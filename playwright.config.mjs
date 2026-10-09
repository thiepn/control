import {defineConfig,devices} from '@playwright/test';
// Real Chromium against Next.js, but only synthetic fixture APIs are intercepted in CI.
// Authenticated disposable Supabase acceptance runs as a separate opt-in suite.
export default defineConfig({
 testDir:'./tests/browser',
 testMatch:['*.fixture.spec.mjs'],
 timeout:30000,
 expect:{timeout:8000},
 retries:process.env.CI?1:0,
 workers:process.env.CI?2:undefined,
 reporter:[['list'],['json',{outputFile:'test-results/p6-fixture-results.json'}]],
 use:{baseURL:'http://127.0.0.1:3137',trace:'retain-on-failure',screenshot:'only-on-failure',
  video:'off',actionTimeout:8000},
 projects:[
  {name:'chromium-desktop',use:{...devices['Desktop Chrome'],viewport:{width:1366,height:768}}},
  {name:'chromium-mobile',use:{...devices['Pixel 7'],browserName:'chromium'}}
 ],
 webServer:{command:'npm run start -- -p 3137',url:'http://127.0.0.1:3137/__p6_fixture__',
  reuseExistingServer:!process.env.CI,timeout:120000,
  env:{CONTROL_P6_FIXTURE_MODE:'ISOLATED_BROWSER_CI'}},
 outputDir:'test-results/p6-browser'
});
