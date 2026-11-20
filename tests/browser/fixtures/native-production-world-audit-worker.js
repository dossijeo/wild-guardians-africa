import './native-worker-world-audit-worker.js';

// Observe the real preparation endpoint. Hold one genuine READY reply so the
// page can inspect its resources, then forward it unchanged and block this
// Worker. The source authority and draw Worker retain their normal transports.
const productionMessage=self.onmessage,send=self.postMessage.bind(self);
let diagnostic=null,held=null,heldOnce=false,holdWatering=false;
function block(stage,durationMs){
 if(!Number.isSafeInteger(durationMs)||durationMs<1||durationMs>5000)throw Error('Invalid production audit stall');
 const start=performance.timeOrigin+performance.now();diagnostic.postMessage({kind:'production-block-start',stage,start});
 const until=performance.now()+durationMs;while(performance.now()<until){}
 diagnostic.postMessage({kind:'production-block-end',stage,start,end:performance.timeOrigin+performance.now()});
}
self.onmessage=event=>{
 const data=event.data;
 if(data?.kind==='configure-production-audit'){diagnostic=data.port;holdWatering=data.holdWatering===true;diagnostic.start();return;}
 if(data?.kind==='block-production-preparation'){block('preparation',data.durationMs);return;}
 if(data?.kind==='release-production-ready'){
  if(!held)throw Error('No production READY reply retained');const forward=held;held=null;forward();block('commit',data.durationMs);return;
 }
 if(data?.remoteGpuPort)data.remoteGpuPort.addEventListener('message',({data:reply})=>{if(reply.result?.disposed===true)diagnostic?.postMessage({kind:'production-gpu-drained',at:performance.timeOrigin+performance.now(),receipt:reply.result});});
 if(data?.kind==='attachNativeResourcePreparation'){
  const port=data.port,post=port.postMessage.bind(port);
  if(holdWatering)port.addEventListener('message',({data:request})=>{
   if(request.kind==='commitNativeGateResources')for(const key of ['nativeTaskActionBinding','nativeInitialIdleBodyBinding','nativeTaskStartBinding']){
    const binding=request.commit?.[key];if(binding)diagnostic.postMessage({kind:'production-acquired',key,binding});
   }
  });
  port.postMessage=(message,...args)=>{
   const reference=holdWatering?(message?.result?.preparedInitialIdleBodyTemplate?.wateringSource?message.result.preparedInitialIdleBodyTemplate:null):message?.result?.preparedIdleStrollTemplate;
   if(!heldOnce&&message.kind==='nativeGateResourcesResult'&&reference){heldOnce=true;held=()=>post(message,...args);diagnostic.postMessage({kind:'production-resources-ready',at:performance.timeOrigin+performance.now(),reference});return;}
   return post(message,...args);
  };
 }
 return productionMessage(event);
};
self.postMessage=(message,...args)=>{if(message.kind==='disposed')diagnostic?.postMessage({kind:'production-disposed',at:performance.timeOrigin+performance.now()});return send(message,...args);};
