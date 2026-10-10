// Safe canonicalization for a fixed GitHub REST endpoint; no arbitrary hosts/paths.
export function parseRepositoryName(input){
 if(typeof input!=='string'||input.length>250)return null;
 const text=input.trim();
 const match=/^(?:https:\/\/github\.com\/)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/?$/.exec(text);
 if(!match)return null;
 const parts=[match[1],match[2]];
 if(parts.some(x=>x.length>100||x==='.'||x==='..'||!/[A-Za-z0-9]/.test(x)))return null;
 return parts.join('/');
}
