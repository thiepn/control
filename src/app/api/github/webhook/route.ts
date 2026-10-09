import {verifyWebhook,parseWebhook} from '@/lib/github-evidence.mjs';
import {adminClient} from '@/lib/supabase/admin';
import {json,fail} from '@/lib/http';
export const runtime='nodejs';
export async function POST(req:Request){
 const secret=process.env.GITHUB_WEBHOOK_SECRET;
 const install=process.env.GITHUB_APP_INSTALLATION_ID;
 if(!secret||!install)return json({error:'Webhook not configured'},503);
 const size=Number(req.headers.get('content-length')||0);
 if(size>512*1024)return json({error:'Payload too large'},413);
 const raw=Buffer.from(await req.arrayBuffer());
 if(raw.length>512*1024)return json({error:'Payload too large'},413);
 if(!verifyWebhook(secret,raw,req.headers.get('x-hub-signature-256')))
  return json({error:'Invalid signature'},401);
 let e;
 try{e=parseWebhook(raw,req.headers.get('x-github-event'),req.headers.get('x-github-delivery'),install);}
 catch{return json({error:'Unsupported or invalid event'},400);}
 const {error}=await adminClient().rpc('control_ingest_github_event',{
  p_repository_id:e.repositoryId,p_delivery:e.delivery,p_kind:e.eventType,
  p_sha:e.sha,p_summary:e.summary
 });
 if(error)return fail(error);
 return json({received:true}); // No private link or owner inventory reflected to caller.
}
