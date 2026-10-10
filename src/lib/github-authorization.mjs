// GitHub App installation tokens are global to this deployed backend, not to a
// Supabase browser account. Restrict private installation metadata to the
// explicitly configured human Control owner; default deny until configured.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function githubPrivateAccessAllowed(sessionOwnerId,allowedOwnerId=process.env.CONTROL_GITHUB_ALLOWED_OWNER_ID){
 return typeof sessionOwnerId==='string'&&typeof allowedOwnerId==='string'
  &&UUID.test(sessionOwnerId)&&UUID.test(allowedOwnerId)
  &&sessionOwnerId.toLowerCase()===allowedOwnerId.toLowerCase();
}
