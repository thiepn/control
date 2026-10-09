import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createVerify} from 'node:crypto';
import {githubAppJwt,githubRepoUrl} from '../src/lib/github-app.mjs';
import {readFileSync} from 'node:fs';
test('GitHub App JWT is genuinely RS256-signed for configured app',()=>{
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const token=githubAppJwt('1234',privateKey.export({type:'pkcs8',format:'pem'}),1780000000);
 const [h,p,s]=token.split('.');
 assert.equal(JSON.parse(Buffer.from(h,'base64url')).alg,'RS256');
 const claims=JSON.parse(Buffer.from(p,'base64url'));assert.equal(claims.iss,'1234');
 assert.ok(claims.exp-claims.iat<=600);
 assert.equal(createVerify('RSA-SHA256').update(h+'.'+p).end().verify(publicKey,Buffer.from(s,'base64url')),true);
});
test('GitHub API endpoints are fixed-host and reject arbitrary network destinations',()=>{
 assert.match(githubRepoUrl('thiepn/control','pulls'),/^https:\/\/api\.github\.com\/repos\/thiepn\/control\/pulls/);
 assert.throws(()=>githubRepoUrl('../foo','pulls'));
 assert.throws(()=>githubRepoUrl('example.com/evil','https://attacker.com'));
});
test('public webhook requires real signature and reconciliation is protected',()=>{
 const hook=readFileSync(new URL('../src/app/api/github/webhook/route.ts',import.meta.url),'utf8');
 const rec=readFileSync(new URL('../src/app/api/github/reconcile/route.ts',import.meta.url),'utf8');
 assert.match(hook,/verifyWebhook\(secret,raw/);
 assert.match(hook,/GITHUB_APP_INSTALLATION_ID/);
 assert.match(rec,/sameOrigin\(req\)/);
 assert.match(rec,/requireOwner\(\)/);
 assert.match(rec,/CRON_SECRET/);
});
