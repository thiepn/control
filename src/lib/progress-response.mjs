/** @param {{ok:boolean,json:()=>Promise<unknown>}} response */
export async function readProgressData(response){
 if(!response?.ok)throw Error('Could not load recorded progress');
 let data;
 try{data=await response.json();}catch{throw Error('Invalid progress response');}
 if(!data || typeof data!=='object' || Array.isArray(data) ||
  !Array.isArray(data.targets) || !Array.isArray(data.phases) || !Array.isArray(data.focus))
  throw Error('Invalid progress response');
 return {targets:data.targets,phases:data.phases,focus:data.focus};
}
