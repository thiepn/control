import {defineConfig,devices} from '@playwright/test';
// Optional real disposable Supabase acceptance, NEVER fixture CI.
export default defineConfig({
 testDir:'./tests/browser',testMatch:['*.auth.spec.mjs'],timeout:45000,retries:0,workers:1,
 use:{baseURL:'http://127.0.0.1:3138',trace:'off',screenshot:'off',video:'off',actionTimeout:10000},
 projects:[{name:'chromium-disposable-auth',use:{...devices['Desktop Chrome']}}],
 reporter:[['list']],
 webServer:{command:'npm run start -- -p 3138',url:'http://127.0.0.1:3138',
  reuseExistingServer:false,timeout:120000,
  env:{NEXT_PUBLIC_SUPABASE_URL:process.env.CONTROL_TEST_SUPABASE_URL||'',
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:process.env.CONTROL_TEST_PUBLISHABLE_KEY||'',
   SUPABASE_SECRET_KEY:process.env.CONTROL_TEST_SERVICE_KEY||''}}
});
