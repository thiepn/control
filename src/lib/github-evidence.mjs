import {createHmac,timingSafeEqual} from 'node:crypto';

const sha40 = /^[a-f0-9]{40}$/;
const maxPayload = 512*1024;
export function verifyWebhook(secret,raw,signature) {
  if(!secret||typeof signature!=='string'||!/^sha256=[a-f0-9]{64}$/.test(signature))
    return false;
  const expected=createHmac('sha256',secret).update(raw).digest();
  const provided=Buffer.from(signature.slice(7),'hex');
  return expected.length===provided.length && timingSafeEqual(expected,provided);
}
export function parseWebhook(raw,event,delivery,expectedInstallation){
  if(!Buffer.isBuffer(raw)||raw.length>maxPayload||!/^[a-f0-9-]{36}$/i.test(delivery||''))
    throw Error('Invalid delivery');
  if(!['push','pull_request','workflow_run','check_run'].includes(event)) throw Error('Unsupported event');
  const p=JSON.parse(raw.toString('utf8'));
  const id=p.repository?.id,full_name=p.repository?.full_name;
  if(!Number.isSafeInteger(id)||id<=0 ||typeof full_name!=='string'||! /^[\w.-]+\/[\w.-]+$/.test(full_name))
    throw Error('Invalid repository');
  if(!Number.isSafeInteger(Number(expectedInstallation))||!expectedInstallation
    ||Number(p.installation?.id)!==Number(expectedInstallation)) throw Error('Installation mismatch');
  const head=event==='push'?p.after:
             event==='pull_request'?p.pull_request?.head?.sha:
             event==='workflow_run'?p.workflow_run?.head_sha:p.check_run?.head_sha;
  if(typeof head!=='string'||!sha40.test(head))throw Error('Invalid head SHA');
  const action=typeof p.action==='string'?p.action:'push';
  const item=event==='pull_request'?p.pull_request:
             event==='workflow_run'?p.workflow_run:
             event==='check_run'?p.check_run:null;
  const number=event==='pull_request'?item?.number:undefined;
  const externalId=event==='push'?head:item?.id;
  const summary={
    action:action.slice(0,40),state:typeof item?.state==='string'?item.state.slice(0,32):null,
    conclusion:typeof item?.conclusion==='string'?item.conclusion.slice(0,32):null,
    external_id:Number.isSafeInteger(externalId)?externalId:null,
    number:Number.isSafeInteger(number)?number:null,
    url:typeof item?.html_url==='string'&&item.html_url.startsWith('https://github.com/')?item.html_url.slice(0,500):null,
    head_sha:head
  };
  return {repositoryId:id,fullName:full_name,eventType:event,delivery:'webhook:'+delivery,sha:head,summary};
}
export function reconcileEvidence(repoId,kind,item){
  if(!Number.isSafeInteger(repoId)||repoId<=0 ||!['workflow_run','pull_request'].includes(kind))throw Error('Invalid reconciliation type');
  const sha=kind==='workflow_run'?item.head_sha:item.head?.sha;
  if(typeof sha!=='string'||!sha40.test(sha)||!Number.isSafeInteger(item.id))throw Error('Invalid reconciliation head');
  const key='reconcile:'+kind+':'+item.id+':'+(item.updated_at||item.state||'unknown');
  return {repositoryId:repoId,eventType:kind,delivery:key.slice(0,180),sha,
   summary:{action:'reconcile',head_sha:sha,external_id:item.id,number:kind==='pull_request'?item.number:null,
    conclusion:kind==='workflow_run'?item.conclusion:null,
    state:item.state||item.status||null,
    url:typeof item.html_url==='string'&&item.html_url.startsWith('https://github.com/')?item.html_url.slice(0,500):null}};
}
