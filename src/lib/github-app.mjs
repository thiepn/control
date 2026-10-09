import {createSign} from 'node:crypto';
const b64url=value=>Buffer.from(value).toString('base64url');
export function githubAppJwt(appId,pem,now=Math.floor(Date.now()/1000)){
 if(!/^\d+$/.test(String(appId))||!pem||!Number.isSafeInteger(now))throw Error('GitHub App not configured');
 const header=b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
 const payload=b64url(JSON.stringify({iat:now-60,exp:now+540,iss:String(appId)}));
 const unsigned=header+'.'+payload;
 const sig=createSign('RSA-SHA256').update(unsigned).end().sign(pem).toString('base64url');
 return unsigned+'.'+sig;
}
export async function installationToken(env=process.env){
 const appId=env.GITHUB_APP_ID,installation=env.GITHUB_APP_INSTALLATION_ID;
 const pem=env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g,'\n');
 if(!appId||!installation||!pem||!/^\d+$/.test(installation))throw Error('GitHub App not configured');
 const jwt=githubAppJwt(appId,pem);
 const response=await fetch('https://api.github.com/app/installations/'+installation+'/access_tokens',{
  method:'POST',headers:{'Authorization':'Bearer '+jwt,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
  cache:'no-store'
 });
 if(!response.ok)throw Error('GitHub App token unavailable');
 const data=await response.json();
 if(typeof data.token!=='string'||!data.token)throw Error('Invalid GitHub App token');
 return data.token;
}
export function githubRepoUrl(name,path){
 const segments=typeof name==='string'?name.split('/'):[];
 if(segments.length!==2 || segments.some(part=>! /^[A-Za-z0-9_.-]+$/.test(part)||!/[A-Za-z0-9]/.test(part))
    ||!['pulls','actions/runs'].includes(path))throw Error('Invalid GitHub resource');
 return 'https://api.github.com/repos/'+name.split('/').map(encodeURIComponent).join('/')+'/'+path+'?per_page=25&state=open';
}
