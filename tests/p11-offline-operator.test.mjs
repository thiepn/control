import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {outsidePublicRepo} from '../scripts/p11-offline-operator-audit.mjs';
test('operator intake rejects public-repo targets, symlinks and relative paths',()=>{
 const dir=mkdtempSync(join(tmpdir(),'control-p11-external-'));
 try{
  const path=join(dir,'packet.json'),link=join(dir,'link.json');
  writeFileSync(path,'{}');symlinkSync(path,link);
  assert.equal(outsidePublicRepo(path),path);
  assert.throws(()=>outsidePublicRepo(link));
  assert.throws(()=>outsidePublicRepo('packet.json'));
  assert.throws(()=>outsidePublicRepo(path,dir));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
