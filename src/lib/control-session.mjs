// Pure client-side decision; server permission remains enforced by requireOwner.
// INITIAL_SESSION can be null before token hydration and is not a sign-out.
export function ownerSessionChanged(event, sessionOwnerId, pageOwnerId){
 if(event==='SIGNED_OUT')return true;
 if(typeof sessionOwnerId!=='string'||typeof pageOwnerId!=='string')return false;
 return sessionOwnerId!==pageOwnerId;
}
