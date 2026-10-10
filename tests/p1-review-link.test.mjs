import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/components/Dashboard.tsx',import.meta.url),'utf8');

test('candidate link target is independent of detail dialog selection',()=>{
 assert.match(source,/\[selected,setSelected\]=useState<string\|null>\(null\)/);
 assert.match(source,/\[candidateTargets,setCandidateTargets\]=useState<Record<string,string>>\(\{\}\)/);
 assert.match(source,/projectId:action==='link'\?candidateTargets\[c\.id\]:undefined/);
 assert.doesNotMatch(source,/projectId:action==='link'\?selected:undefined/);
 assert.doesNotMatch(source,/projectId:action==='link'\?linkTargetId:undefined/);
});

test('review tab provides per-repository labelled explicit destination selectors',()=>{
 assert.match(source,/candidates\.filter\(c=>c\.review_status==='pending'\)\.map\(c=>/);
 assert.match(source,/aria-label=\{'Destination project for '\+c\.full_name\}/);
 assert.match(source,/value=\{candidateTargets\[c\.id\]\|\|''\}/);
 assert.match(source,/setCandidateTargets\(prev=>\(\{\.\.\.prev,\[c\.id\]:e\.target\.value\}\)\)/);
 assert.match(source,/<option value="">Choose project…<\/option>/);
 assert.match(source,/rows\.filter\(p=>p\.lifecycle!=='archived'\)\.map/);
 assert.match(source,/disabled=\{!candidateTargets\[c\.id\]\} onClick=\{\(\)=>review\(c,'link'\)\}/);
});

test('modal dismissal does not reset per-repository candidate destinations',()=>{
 assert.match(source,/onClick=\{\(\)=>setSelected\(null\)\}/);
 assert.doesNotMatch(source,/setSelected\(null\);setCandidateTargets/);
});
