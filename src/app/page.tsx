import { userClient } from '@/lib/supabase/server';
import Dashboard from '@/components/Dashboard';
import Login from '@/components/Login';
export const dynamic='force-dynamic';
export default async function Home(){
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
   return <main className="configuration"><h1>THIEPN / CONTROL</h1><p>Private backend is not configured. No sample portfolio or synthetic progress is displayed.</p></main>;
 }
 const client=await userClient();const { data }=await client.auth.getUser();
 return data.user && !data.user.is_anonymous?<Dashboard/>:<Login/>;
}
