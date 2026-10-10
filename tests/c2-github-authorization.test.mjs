import test from 'node:test';
import assert from 'node:assert/strict';
import {githubPrivateAccessAllowed} from '../src/lib/github-authorization.mjs';
const owner='11111111-1111-4111-8111-111111111111';
test('GitHub App private repo metadata defaults deny when owner not explicitly configured',()=>{
 assert.equal(githubPrivateAccessAllowed(owner,undefined),false);
 assert.equal(githubPrivateAccessAllowed(owner,''),false);
 assert.equal(githubPrivateAccessAllowed(owner,'22222222-2222-4222-8222-222222222222'),false);
 assert.equal(githubPrivateAccessAllowed(owner,'not-a-uuid'),false);
 assert.equal(githubPrivateAccessAllowed(owner,owner),true);
});
