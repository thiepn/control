// NO production requests. Invoke separately before opt-in real two-account acceptance.
import {validateStaging} from '../src/lib/p7-staging.mjs';
const result=validateStaging(process.env);
if(!result.approvedForLocalAcceptance)throw Error('Disposable staging denied');
console.log('P7 offline disposable staging preflight passed; real Auth not yet certified.');
