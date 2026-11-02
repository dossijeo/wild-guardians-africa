// Experimental single-producer event/pose fence. No collision detection or
// continuous trajectory certification is implied by this ordering primitive.
export function createVisualEventFence(session,{capacity=128,classify}={}){
 if(typeof session!=='string'||!session||!Number.isSafeInteger(capacity)||capacity<1||typeof classify!=='function')throw TypeError('Invalid fence configuration');
 let received=0,nextEvent=0,displayed=0,minimum=0,queue=[],fault=false;
 const validSequence=x=>Number.isSafeInteger(x)&&x>=0;
 return {
  receive(batch){
   if(batch?.session!==session)return {accepted:false,reason:'session'};
   if(fault)return {accepted:false,reason:'fault',hide:true};
   if(!validSequence(batch.sequence)||batch.sequence!==received+1||batch.firstEvent!==nextEvent||!Array.isArray(batch.events)){fault=true;return {accepted:false,reason:'order',hide:true};}
   if(queue.length+batch.events.length>capacity){fault=true;return {accepted:false,reason:'capacity',hide:true};}
   const records=[];try{for(const value of batch.events){if(!value||typeof value!=='object'||typeof value.type!=='string'||!value.type)throw TypeError('Invalid event');const policy=classify(value);if(policy!=='structural'&&policy!=='visual')throw TypeError('Unknown event policy');records.push({sequence:batch.sequence,policy,event:structuredClone(value)});}}catch(error){fault=true;throw error;}
   const urgent=records.filter(r=>r.policy==='structural');queue.push(...records);received=batch.sequence;nextEvent+=records.length;if(urgent.length)minimum=Math.max(minimum,batch.sequence);
   return {accepted:true,urgent:urgent.map(r=>structuredClone(r.event)),hide:displayed<minimum};
  },
  present(sequence){
   if(fault)return {accepted:false,reason:'fault',hide:true};
   if(!validSequence(sequence)||sequence<displayed||sequence>received)return {accepted:false,reason:'order',hide:displayed<minimum};
   if(sequence<minimum)return {accepted:false,reason:'invalidated',hide:true};
   let n=0;while(n<queue.length&&queue[n].sequence<=sequence)n++;const ready=queue.splice(0,n).map(r=>r.event);displayed=sequence;
   return {accepted:true,events:ready,hide:false};
  },
  state(){return {received,nextEvent,displayed,minimum,pending:queue.length,fault,hide:fault||displayed<minimum};}
 };
}
