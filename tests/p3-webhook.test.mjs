import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {verifyWebhook,parseWebhook,reconcileEvidence} from '../src/lib/github-evidence.mjs';
const sha='a'.repeat(40),delivery='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
function make(){return Buffer.from(JSON.stringify({installation:{id:1234},repository:{id:9898,full_name:'thiepn/control'},action:'completed',workflow_run:{id:4321,head_sha:sha,updated_at:'2026-10-09T00:00:00Z',conclusion:'success',html_url:'https://github.com/thiepn/control/actions/runs/4321'}}));}
test('raw-body HMAC rejects forged, malformed or missing signatures',()=>{
 const raw=make(),sig='sha256='+createHmac('sha256','correct').update(raw).digest('hex');
 assert.equal(verifyWebhook('correct',raw,sig),true);
 assert.equal(verifyWebhook('wrong',raw,sig),false);
 assert.equal(verifyWebhook('correct',raw,sig.toUpperCase()),false);
 assert.equal(verifyWebhook('correct',Buffer.concat([raw,Buffer.from(' ')]),sig),false);
 assert.equal(verifyWebhook('correct',raw,null),false);
});
test('parse webhook binds installation, repo ID, delivery ID and exact SHA',()=>{
 const p=parseWebhook(make(),'workflow_run',delivery,'1234');
 assert.equal(p.repositoryId,9898);assert.equal(p.sha,sha);
 assert.equal(p.summary.conclusion,'success');assert.equal(p.summary.external_id,4321);
 const sameRun=reconcileEvidence(9898,'workflow_run',{id:4321,head_sha:sha,updated_at:'2026-10-09T00:00:00Z',conclusion:'success'});
 assert.equal(p.delivery,sameRun.delivery,'webhook and reconciliation must share stable event id');
 assert.throws(()=>parseWebhook(make(),'workflow_run',delivery,'5678'),/Installation/);
 assert.throws(()=>parseWebhook(make(),'delete',delivery,'1234'),/Unsupported/);
 assert.throws(()=>parseWebhook(make(),'workflow_run','broken','1234'),/delivery/);
});
test('normalizer refuses untrusted source URLs and invalid SHA',()=>{
 const raw=JSON.parse(make().toString());raw.workflow_run.head_sha='not-a-sha';
 assert.throws(()=>parseWebhook(Buffer.from(JSON.stringify(raw)),'workflow_run',delivery,'1234'));
 assert.throws(()=>reconcileEvidence(9898,'workflow_run',{id:2,head_sha:'bad'}));
 const x=reconcileEvidence(9898,'workflow_run',{id:22,head_sha:sha,updated_at:'2026-10-09T00:00:00Z',conclusion:'success'});
 assert.equal(x.sha,sha);assert.match(x.delivery,/github:workflow_run:22/);
});
