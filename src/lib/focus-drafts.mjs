// Drafts are keyed by both actual project identity and Berlin week,
// never by one shared field across different weekly focus forms.
export function focusDraftKey(projectId,week){
 return JSON.stringify([projectId,week]);
}
export function focusDraftValue(drafts,projectId,week,persisted){
 const key=focusDraftKey(projectId,week);
 return Object.prototype.hasOwnProperty.call(drafts,key)?drafts[key]:persisted;
}
export function clearFocusDraft(drafts,projectId,week){
 const key=focusDraftKey(projectId,week);
 if(!Object.prototype.hasOwnProperty.call(drafts,key))return drafts;
 const result={...drafts};delete result[key];return result;
}
