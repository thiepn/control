import {requireOwner,json,fail} from '@/lib/http';
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export async function GET(req:Request){
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 const params=new URL(req.url).searchParams;
 const value=params.get('page')||'0',page=Number(value);
 const project=params.get('project');
 if(!/^(0|[1-9]\d{0,2})$/.test(value)||!Number.isInteger(page)||page>20
   ||(project&&!uuid.test(project)))return json({error:'Invalid audit cursor or project'},400);
 let q=auth.reader.from('audit_log')
  .select('id,project_id,actor,action,source_ref,created_at,previous_data,new_data')
  .order('created_at',{ascending:false}).order('id',{ascending:false})
  .range(page*30,page*30+30);
 if(project)q=q.eq('project_id',project);
 const {data,error}=await q;
 if(error)return fail(error);
 const rows=data||[];
 return json({entries:rows.slice(0,30),hasMore:rows.length>30,page,
  note:'Owner-only audit records; offset paging can shift if new events arrive.'});
}
