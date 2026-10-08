// QA-owned resources only. Cleanup continues after individual disposal errors.
export function createQaResourceScope(){
 const entries=[];let closed=false;
 const result={closed:false,disposed:[],errors:[]};
 function release(entry){try{entry.dispose();result.disposed.push(entry.label);}catch(error){result.errors.push({label:entry.label,message:String(error?.message??error)});}}
 return{
  defer(label,dispose){const entry={label,dispose};if(closed)release(entry);else entries.push(entry);},
  assertOpen(){if(closed)throw Error('QA run cancelled or disposed');},
  cleanup(){if(!closed){closed=true;result.closed=true;while(entries.length)release(entries.pop());}return result;},
  result,
 };
}
