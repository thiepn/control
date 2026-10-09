import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checkInventory} from '../scripts/validate-inventory.mjs';
const file='data/private/repository_inventory.json';
test('private inventory is complete and does not fabricate project progress', (t)=> {
  if(!fs.existsSync(file)) {t.skip('private dataset intentionally gitignored');return;}
  assert.deepEqual(checkInventory(file),{valid:true,errors:[],count:86});
});
test('public example seed carries no invented deadlines or progress', ()=>{
  const rows=JSON.parse(fs.readFileSync('data/public/example_projects.json','utf8'));
  assert.ok(rows.length>0);
  for(const p of rows){assert.equal(p.completion_pct,null);assert.equal(p.deadline,null);assert.equal(p.priority,null);}
});
test('schema defines RLS for all 11 owner-scoped tables', ()=>{
  const sql=fs.readFileSync('db/schema.sql','utf8');
  const tables=[...sql.matchAll(/CREATE TABLE public\.(\w+)/g)].map(x=>x[1]);
  assert.equal(tables.length,11);
  for(const t of tables) assert.match(sql,new RegExp(`'${t}'`));
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/REVOKE ALL ON public/);
  assert.match(sql,/FROM PUBLIC, anon, authenticated/);
  assert.doesNotMatch(sql,/GRANT (INSERT|UPDATE|DELETE|ALL) ON public/);
  assert.match(sql,/CREATE POLICY owner_select/);
  assert.doesNotMatch(sql,/SECURITY DEFINER/);
});
