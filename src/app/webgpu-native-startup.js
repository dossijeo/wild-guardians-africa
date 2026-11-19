// Wire the existing resource endpoint once, after native control is attached.
// The authority's existing handshake, not the transfer, certifies readiness.
export async function attachWebGpuNativeResources({client,runtime,isCurrent,channelFactory=()=>new MessageChannel()}={}){
 if(typeof client?.attachNativeResourcePreparation!=='function'||typeof runtime?.attachNativeResourcePreparation!=='function'||typeof isCurrent!=='function'||typeof channelFactory!=='function')throw TypeError('Invalid native resource startup');
 if(!isCurrent())throw Error('World changed during native resource startup');
 const channel=channelFactory();
 try{
  client.attachNativeResourcePreparation(channel.port2);
  const ready=await runtime.attachNativeResourcePreparation(channel.port1);
  if(!isCurrent())throw Error('World changed during native resource startup');
  return ready;
 }catch(error){
  // Close ends still owned here. The caller's existing startup failure path
  // disposes the authority and graphics owners of ends already transferred.
  for(const port of [channel.port1,channel.port2])try{port.close();}catch{}
  throw error;
 }
}
