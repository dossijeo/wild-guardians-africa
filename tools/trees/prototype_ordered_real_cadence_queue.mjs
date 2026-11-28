// Experimental ordered real-time intervals. The caller retains rejected work;
// this queue neither invents simulation time nor changes command boundaries.
export function createRealCadenceQueue(session,send,{capacity=8}={}){
 if(typeof session!=='string'||!session||typeof send!=='function'||!Number.isSafeInteger(capacity)||capacity<1)throw TypeError('Invalid queue');
 let next=1,inflight=null,pending=[],fault=false;
 const pump=()=>{if(fault||inflight||!pending.length)return;inflight=pending.shift();try{send({...inflight,session});}catch(e){fault=true;throw e;}};
 return {
  submit(command){
   if(fault)return {accepted:false,reason:'fault'};
   if(!command||!['advance','pause','resume'].includes(command.kind)||command.kind==='advance'&&(!Number.isFinite(command.seconds)||command.seconds<=0||command.seconds>1))throw TypeError('Invalid command');
   if(pending.length+(inflight?1:0)>=capacity)return {accepted:false,reason:'capacity'};
   const item=command.kind==='advance'?{kind:'advance',seconds:command.seconds,sequence:next++}:{kind:command.kind,sequence:next++};pending.push(item);pump();return {accepted:true,sequence:item.sequence};
  },
  acknowledge(message){
   if(fault)return {accepted:false,reason:'fault'};
   if(message?.session!==session)return {accepted:false,reason:'session'};
   if(!inflight||message.sequence!==inflight.sequence)return {accepted:false,reason:'order'};
   inflight=null;pump();return {accepted:true};
  },
  state(){return {inflight:inflight&&{...inflight},pending:pending.map(x=>({...x})),fault,next};}
 };
}
