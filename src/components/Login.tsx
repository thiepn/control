'use client';
import { useState } from 'react';
import { browserClient } from '@/lib/supabase/browser';
export default function Login(){
 const [email,setEmail]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('');
  const {error}=await browserClient().auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin+'/auth/callback'}});
  setBusy(false);setMessage(error?'Unable to send sign-in link. Please try again.':'Check your email for a sign-in link.');
 }
 return <main className="auth-page"><div className="eyebrow">THIEPN / CONTROL · PRIVATE WORKSPACE</div><section className="auth-box">
  <div className="overline">01 / AUTHENTICATION</div><h1>Your projects.<br/>One direction.</h1>
  <p>Sign in to your private portfolio. No repository or project data is shown without an authenticated session.</p>
  <form onSubmit={submit}><label htmlFor="email">Email address</label><input id="email" autoComplete="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/><button disabled={busy}>{busy?'Sending…':'Send sign-in link →'}</button></form>
  {message&&<p role="status">{message}</p>}
 </section><footer>DECIDE → FINISH → VERIFY</footer></main>;
}
