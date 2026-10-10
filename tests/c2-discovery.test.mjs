import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDiscoveryQuery,normalizeDiscoveredRepository,discoverGithubPage} from '../src/lib/github-discovery.mjs';
const row=(id,full_name,extra={})=>({id,full_name,private:false,visibility:'public',archived:false,...extra});
const fakeResponse=data=>({ok:true,json:async()=>data});
test('owner, paging and mode validation reject unsafe enumeration/URLs',()=>{
 assert.deepEqual(parseDiscoveryQuery({owner:'thiepn',source:'public',page:'2'}),{owner:'thiepn',source:'public',page:2});
 for(const owner of ['', '../evil','thiepn/control','foo.bar','a'.repeat(40)])
  assert.throws(()=>parseDiscoveryQuery({owner}));
 for(const page of [0,11,1.5,'nan'])assert.throws(()=>parseDiscoveryQuery({owner:'thiepn',page}));
 assert.throws(()=>parseDiscoveryQuery({owner:'thiepn',source:'everything'}));
});
test('owner exact match, canonical GitHub ID and public-only privacy',()=>{
 assert.deepEqual(normalizeDiscoveredRepository(row(7,'thiepn/Control'),'thiepn','public'),{id:7,full_name:'thiepn/Control',visibility:'public',archived:false});
 for(const r of [row(0,'thiepn/repo'),row(9,'newmedu/repo'),row(1,'thiepn/repo/issues'),row(8,'thiepn/private',{private:true})])
  assert.equal(normalizeDiscoveredRepository(r,'thiepn','public'),null);
});
test('public page fetch is fixed to GitHub and deduplicates API records',async()=>{
 const urls=[];const fetchImpl=async(url,options)=>{urls.push({url,options});return fakeResponse([
  row(42,'thiepn/alpha'),row(42,'thiepn/alpha'),row(50,'other/repo'),row(43,'thiepn/beta',{archived:true})
 ]);};
 const p=await discoverGithubPage({owner:'thiepn',page:1},{fetchImpl});
 assert.deepEqual(p.items.map(r=>r.id),[42,43]);
 assert.equal(p.hasNext,false);
 assert.match(urls[0].url,/^https:\/\/api.github.com\/users\/thiepn\/repos\?/);
 assert.equal(urls[0].options.redirect,'error');
 assert.equal(urls[0].options.headers.Authorization,undefined);
});
test('installation mode requires authorized signer and filters another owner',async()=>{
 await assert.rejects(()=>discoverGithubPage({owner:'newmedu',source:'installation'}, {fetchImpl:async()=>fakeResponse({repositories:[]})}),/App unavailable/);
 const seen=[];const p=await discoverGithubPage({owner:'newmedu',source:'installation'},{
  installationToken:async()=> 'TEST_TOKEN_ONLY',
  fetchImpl:async(url,options)=>{seen.push({url,headers:options.headers});return fakeResponse({repositories:[
    row(21,'thiepn/alpha',{private:true}),row(22,'newmedu/nml',{private:true})
  ]});}
 });
 assert.deepEqual(p.items.map(r=>r.full_name),['newmedu/nml']);
 assert.equal(seen[0].headers.Authorization,'Bearer TEST_TOKEN_ONLY');
 assert.match(seen[0].url,/^https:\/\/api.github.com\/installation\/repositories/);
});
