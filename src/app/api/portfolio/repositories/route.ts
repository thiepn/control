import {requireOwner,json,fail} from '@/lib/http';
export async function GET(){
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 const [links,repos]=await Promise.all([
  auth.reader.from('project_repository_links').select('project_id,repository_id,link_role').limit(501),
  auth.reader.from('github_repositories').select('id,full_name').limit(501)
 ]);
 if(links.error||repos.error)return fail(links.error||repos.error);
 const byId=new Map((repos.data||[]).map(r=>[r.id,r.full_name]));
 return json({links:(links.data||[]).slice(0,500).map(l=>({
  project_id:l.project_id,full_name:byId.get(l.repository_id)||null,link_role:l.link_role
 })),partial:(links.data?.length||0)>500||(repos.data?.length||0)>500});
}
