import {notFound} from 'next/navigation';
import OperationsWorkspace from '@/components/OperationsWorkspace';
export const dynamic='force-dynamic';
// This is a test surface only, not an authentication substitute.
// Unavailable in every normal deployment unless explicitly enabled at server startup.
export default function Fixture(){
 if(process.env.CONTROL_P6_FIXTURE_MODE!=='ISOLATED_BROWSER_CI')notFound();
 return <><a href="#p6-content" className="skip-control">Skip to main content</a>
  <main id="p6-content" tabIndex={-1} style={{maxWidth:1120,margin:'0 auto',padding:'22px 16px'}}>
  <p className="overline">SYNTHETIC BROWSER FIXTURE — NOT AUTHENTICATED ACCEPTANCE</p>
  <h1>Portfolio Review</h1>
  <OperationsWorkspace projects={[
   {id:'11111111-1111-4111-8111-111111111112',title:'Synthetic Atlas'},
   {id:'11111111-1111-4111-8111-111111111113',title:'Synthetic Delta'}]}/>
  </main></>;
}
