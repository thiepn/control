// Server-only owner allowlist for the private personal Control instance.
// No Auth user is authorized unless explicitly present in deployment configuration.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function controlOwnerConfigured(value=process.env.CONTROL_ALLOWED_OWNER_IDS){
 if(typeof value!=='string'||!value.trim())return false;
 const ids=value.split(',').map(x=>x.trim());
 return ids.length<=5 && ids.every(id=>UUID.test(id)) &&
   new Set(ids.map(x=>x.toLowerCase())).size===ids.length;
}
export function controlOwnerAllowed(id,configured=process.env.CONTROL_ALLOWED_OWNER_IDS){
 if(typeof id!=='string'||!UUID.test(id)||!controlOwnerConfigured(configured))return false;
 return configured.split(',').some(part=>part.trim().toLowerCase()===id.toLowerCase());
}
