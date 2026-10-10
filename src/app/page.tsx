import { userClient } from '@/lib/supabase/server';
import Dashboard from '@/components/Dashboard';
import Login from '@/components/Login';
import AccessDenied from '@/components/AccessDenied';
import {controlOwnerAllowed,controlOwnerConfigured} from '@/lib/control-owner.mjs';
export const dynamic='force-dynamic';
export default async function Home(){
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
   return <main className="configuration"><h1>THIEPN / CONTROL</h1><p>Private backend is not configured. No sample portfolio or synthetic progress is displayed.</p></main>;
 }
 if(!controlOwnerConfigured()) {
   return <main className="configuration"><h1>THIEPN / CONTROL</h1><p>Private owner access is not configured. Set the server-only CONTROL_ALLOWED_OWNER_IDS to the approved Supabase Auth user ID before sign-in.</p></main>;
 }
 const client=await userClient();const { data, error }=await client.auth.getUser();
 if(error || !data.user || data.user.is_anonymous)return <Login/>;
 return controlOwnerAllowed(data.user.id)?<Dashboard ownerId={data.user.id}/>:<AccessDenied/>;
}
