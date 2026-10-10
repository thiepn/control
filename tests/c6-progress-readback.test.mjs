import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readProgressData} from '../src/lib/progress-response.mjs';
const source=readFileSync(new URL('../src/components/ProgressWorkspace.tsx',import.meta.url),'utf8');
test('a failed authenticated progress response never means no current target',async()=>{
 await assert.rejects(()=>readProgressData({ok:false,json:async()=>({})}),/Could not load recorded progress/);
 await assert.rejects(()=>readProgressData({ok:true,json:async()=>{throw Error('bad json');}}),/Invalid progress response/);
 for(const value of [null,{},[],{targets:[],phases:[]},{targets:{},phases:[],focus:[]}])
  await assert.rejects(()=>readProgressData({ok:true,json:async()=>value}),/Invalid progress response/);
});
test('a genuine validated empty response is distinct from a failed or malformed response',async()=>{
 const data=await readProgressData({ok:true,json:async()=>({targets:[],phases:[],focus:[]})});
 assert.deepEqual(data,{targets:[],phases:[],focus:[]});
 const real={targets:[{id:'milestone',name:'Existing target'}],phases:[],focus:[]};
 assert.deepEqual(await readProgressData({ok:true,json:async()=>real}),real);
});
test('Progress UI only offers create outcome after a successful authenticated read, and retry never writes',()=>{
 assert.match(source,/progressLoad,setProgressLoad\]=useState<'loading'\|'ready'\|'unavailable'>\('loading'\)/);
 assert.match(source,/setProgressLoad\('unavailable'\);throw e/);
 assert.match(source,/progressLoad!=='ready'\?/);
 assert.match(source,/Recorded progress is unavailable, not empty/);
 assert.match(source,/Retry progress read/);
 assert.match(source,/onClick=\{\(\)=>reload\(\)\.then/);
 assert.match(source,/progressLoad!=='ready'[\s\S]*?:<>[\s\S]*?!current\?<form/);
});
