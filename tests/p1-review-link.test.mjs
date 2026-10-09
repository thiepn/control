import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../src/components/Dashboard.tsx',import.meta.url),'utf8');

test('candidate link target is independent of detail dialog selection',()=>{
  assert.match(source,/\[selected,setSelected\]=useState<string\|null>\(null\)/);
  assert.match(source,/\[linkTargetId,setLinkTargetId\]=useState\(''\)/);
  assert.match(source,/projectId:action==='link'\?linkTargetId:undefined/);
  assert.doesNotMatch(source,/projectId:action==='link'\?selected:undefined/);
});

test('review tab provides labelled explicit destination selector',()=>{
  assert.match(source,/<label className="block-label" htmlFor="candidate-link-target">LINK CANDIDATES TO PROJECT<\/label>/);
  assert.match(source,/<select id="candidate-link-target" value=\{linkTargetId\} onChange=\{e=>setLinkTargetId\(e.target.value\)\}>/);
  assert.match(source,/<option value="">Choose a project…<\/option>/);
  assert.match(source,/rows\.filter\(p=>p\.lifecycle!=='archived'\)\.map/);
  assert.match(source,/disabled=\{!linkTargetId\} onClick=\{\(\)=>review\(c,'link'\)\}/);
});

test('modal dismissal does not reset candidate destination',()=>{
  assert.match(source,/onClick=\{\(\)=>setSelected\(null\)\}/);
  assert.doesNotMatch(source,/setSelected\(null\);setLinkTargetId\(''\)/);
});
