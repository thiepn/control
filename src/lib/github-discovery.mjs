import {parseRepositoryName} from './repo-name.mjs';

export const PAGE_SIZE=100;
export const OWNER_PATTERN=/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

export function parseDiscoveryQuery(input){
 const owner=typeof input?.owner==='string'?input.owner.trim():'';
 const source=input?.source||'public';
 const page=Number(input?.page??1);
 if(!OWNER_PATTERN.test(owner)||!['public','installation'].includes(source)
   ||!Number.isInteger(page)||page<1||page>10)throw Error('Invalid discovery scope');
 return {owner,source,page};
}
export function normalizeDiscoveredRepository(repo,owner,source){
 if(!repo||typeof repo!=='object'||!Number.isSafeInteger(repo.id)||repo.id<=0
   ||typeof repo.full_name!=='string'||parseRepositoryName(repo.full_name)!==repo.full_name
   ||repo.full_name.split('/')[0].toLowerCase()!==owner.toLowerCase())return null;
 // Public mode must not claim access to private/internal data.
 if(source==='public' && (repo.private!==false || repo.visibility==='private'||repo.visibility==='internal'))return null;
 return {id:repo.id,full_name:repo.full_name,visibility:repo.private?'private':repo.visibility==='internal'?'internal':'public',
  archived:repo.archived===true};
}
export async function discoverGithubPage(input,{fetchImpl=fetch,installationToken}={}){
 const {owner,source,page}=parseDiscoveryQuery(input);
 const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 if(source==='installation'){
  if(typeof installationToken!=='function')throw Error('GitHub App unavailable');
  headers.Authorization='Bearer '+await installationToken();
 }
 const url=source==='public'
  ?'https://api.github.com/users/'+encodeURIComponent(owner)+'/repos?per_page=100&page='+page+'&sort=full_name&direction=asc&type=owner'
  :'https://api.github.com/installation/repositories?per_page=100&page='+page;
 const response=await fetchImpl(url,{headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error(response.status===404?'GitHub owner or installation unavailable':'GitHub discovery unavailable');
 const payload=await response.json();
 const list=source==='public'?payload:payload?.repositories;
 if(!Array.isArray(list)||list.length>PAGE_SIZE)throw Error('Invalid GitHub page response');
 const unique=new Map();
 for(const value of list){
  const normalized=normalizeDiscoveredRepository(value,owner,source);
  if(normalized && !unique.has(normalized.id))unique.set(normalized.id,normalized);
 }
 return {owner,source,page,items:[...unique.values()],hasNext:list.length===PAGE_SIZE};
}
