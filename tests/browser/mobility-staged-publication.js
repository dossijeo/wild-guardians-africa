// Diagnostic staging around the publisher: a step may have already changed
// authoritative state before its event batch is known. Do not advance again
// until that exact publication has been admitted.
export function createStagedPublication(publisher){
 if(!publisher||typeof publisher.publish!=='function'||typeof publisher.acknowledge!=='function')throw TypeError('Invalid publisher');
 let pending=null,fault=false;
 return {
  submit(projection){
   if(fault)return {kind:'fault'};
   if(pending)return {kind:'blocked',reason:'publication-pending'};
   pending=structuredClone(projection);
   let result;try{result=publisher.publish(pending);}catch(error){fault=true;throw error;}
   if(result.kind==='blocked'){if(result.reason==='oversize')fault=true;return result;}
   pending=null;return result;
  },
  acknowledge(session,sequence){
   if(fault)return {kind:'fault'};
   if(!publisher.acknowledge(session,sequence))return {kind:'rejected',reason:'ack'};
   if(!pending)return {kind:'acknowledged'};
   let result;try{result=publisher.publish(pending);}catch(error){fault=true;throw error;}
   if(result.kind==='blocked'){if(result.reason==='oversize')fault=true;return result;}
   pending=null;return result;
  },
  mayAdvance(){return !fault&&!pending;},
  state(){return {pending:!!pending,fault};}
 };
}
