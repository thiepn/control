import { requireOwner, json, fail, sameOrigin } from '@/lib/http';
import { parseProject } from '@/lib/rules.mjs';
export async function GET() {
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 const {data,error}=await auth.reader.from('projects').select('*').order('manual_rank',{ascending:true}).limit(500);
 if(error)return fail(error);return json({items:data||[]});
}
export async function POST(req:Request) {
 if(!sameOrigin(req))return json({error:'Forbidden origin'},403);
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 try {const payload=parseProject(await req.json(),{create:true});
  const {data,error}=await auth.writer.rpc('control_mutate_project',{p_owner:auth.ownerId,p_action:'create',p_id:null,p_payload:payload,p_version:null});
  if(error)return fail(error);return json({item:data},201);
 } catch{return json({error:'Invalid project input'},400);}
}
