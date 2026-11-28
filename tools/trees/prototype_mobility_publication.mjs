// Experimental receiver for ordered complete projections, not production state.
export function createPublicationReceiver(session){
 if(typeof session!=='string'||!session)throw TypeError('Invalid session');
 let version=0,lastTime=-1;
 return {
  accept(message){
   if(!message||typeof message.session!=='string'||!Number.isSafeInteger(message.version)||message.version<1||!message.projection||!Number.isFinite(message.projection.elapsed)||!Array.isArray(message.projection.events))throw TypeError('Invalid publication');
   if(message.session!==session)return {accepted:false,reason:'session'};
   if(message.version<=version)return {accepted:false,reason:'stale'};
   if(message.version!==version+1)return {accepted:false,reason:'gap'};
   if(message.projection.elapsed<lastTime)throw Error('Confirmed time moved backwards');
   version=message.version;lastTime=message.projection.elapsed;
   return {accepted:true,version};
  }
 };
}
