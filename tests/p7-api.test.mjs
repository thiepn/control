import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/app/api/p7/evidence/route.ts',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/components/DeviceEvidencePanel.tsx',import.meta.url),'utf8');
test('device intake binds authenticated owner, same-origin and server-side RPC',()=>{
 assert.match(source,/requireOwner\(\)/);
 assert.match(source,/sameOrigin\(req\)/);
 assert.match(source,/p_owner:auth\.ownerId/);
 assert.match(source,/control_record_device_observation/);
 assert.match(source,/classification:'self_reported_unverified'/);
 assert.match(source,/acceptedAsApproval:false/);
});
test('receipt input collects only digest and excludes attachments and credentials',()=>{
 assert.match(ui,/Evidence SHA256/);
 assert.match(ui,/Record unverified receipt/);
 assert.doesNotMatch(ui,/type="file"/);
 assert.doesNotMatch(ui,/localStorage/);
 assert.doesNotMatch(source,/req\.formData\(/);
});
