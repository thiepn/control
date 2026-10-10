'use client';
import {useState} from 'react';
import {browserClient} from '@/lib/supabase/browser';
export default function AccessDenied(){
 const [busy,setBusy]=useState(false);
 return <main className="auth-page"><section className="auth-box" role="alert">
  <div className="overline">PRIVATE WORKSPACE</div>
  <h1>Access not permitted</h1>
  <p>This account is not an approved owner of this Control instance. No project data or write access is available.</p>
  <button disabled={busy} onClick={async()=>{setBusy(true);try{await browserClient().auth.signOut();}finally{window.location.assign('/');}}}>Sign out to use another account</button>
 </section></main>;
}
