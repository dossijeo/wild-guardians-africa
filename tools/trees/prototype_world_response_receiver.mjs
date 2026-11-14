// Experimental consumer-side fence for one-shot read-only Worker responses.
export function createWorldResponseReceiver(session,{initialVersion=0,maxPending=64}={}){
 if(typeof session!=='string'||!session||!Number.isSafeInteger(initialVersion)||initialVersion<0||!Number.isSafeInteger(maxPending)||maxPending<1)throw TypeError('Invalid receiver configuration');
 let version=initialVersion,lastId=0;const pending=new Map(),latest=new Map();
 const cleanup=key=>{if(![...pending.values()].some(ticket=>ticket.key===key))latest.delete(key);};
 return {
  advance(next){if(!Number.isSafeInteger(next)||next<=version)throw RangeError('Version must advance');version=next;},
  begin(id,{key='default'}={}){if(!Number.isSafeInteger(id)||id<=lastId||typeof key!=='string'||!key)throw TypeError('Invalid request identity');if(pending.size>=maxPending)throw Error('Response receiver saturated');lastId=id;const ticket=Object.freeze({id,session,version,key});pending.set(id,ticket);latest.set(key,id);return ticket;},
  cancel(id){const ticket=pending.get(id);if(!ticket)return false;pending.delete(id);cleanup(ticket.key);return true;},
  deliver(response,apply){
   if(!response||!Number.isSafeInteger(response.id)||typeof apply!=='function')throw TypeError('Invalid response');
   const ticket=pending.get(response.id);if(!ticket)return {accepted:false,reason:'request'};
   const newest=latest.get(ticket.key);pending.delete(response.id);cleanup(ticket.key);
   if(response.session!==session||response.session!==ticket.session)return {accepted:false,reason:'session'};
   if(!Number.isSafeInteger(response.version)||response.version!==ticket.version)return {accepted:false,reason:'version'};
   if(ticket.version!==version)return {accepted:false,reason:'stale'};
   if(ticket.id!==newest)return {accepted:false,reason:'superseded'};
   if(response.accepted!==true)return {accepted:false,reason:'worker'};
   apply(response.value);return {accepted:true};
  }
 };
}
