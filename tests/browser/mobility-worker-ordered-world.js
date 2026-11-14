import {createWorld} from './mobility-worker-world-change.js';
import {createWorldEventGate} from '../../tools/trees/prototype_world_event_order.mjs';
let world;const gate=createWorldEventGate('ordered-world'),ids=new Map(),options={worker:false,species:'hyena'};
try{world=await createWorld();postMessage({kind:'ready',network:world.network,chunks:world.chunks});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=event=>{const request=event.data;try{
 if(request.kind==='build'){
  const start=performance.now();postMessage({kind:'started',at:performance.timeOrigin+start});const response=gate.query(request,()=>world.session.actorCanStand(request.point,options));
  postMessage({kind:'build-result',...response,elapsed:performance.now()-start,at:performance.timeOrigin+performance.now()});
 }else if(request.kind==='edit'){
  const response=gate.edit(request,()=>{if(request.action==='add'){if(ids.has(request.key))throw Error('Duplicate logical barrier');const id=world.session.core.addOrientedBarrier(request.point.x,request.point.z,1.2,1.2,0,0);if(id<=0)throw Error('Barrier creation failed');ids.set(request.key,id);return id;}if(request.action==='remove'){const id=ids.get(request.key);if(!id||!world.session.core.removeBarrier(id))throw Error('Barrier removal failed');ids.delete(request.key);return id;}throw Error('Invalid edit');});
  postMessage({kind:'edit-result',requestId:request.requestId,...response});
 }else if(request.kind==='query'){
  const response=gate.query(request,()=>request.points.map(point=>world.session.actorCanStand(point,options)));
  postMessage({kind:'query-result',requestId:request.requestId,...response});
 }
}catch(error){postMessage({kind:'error',requestId:request.requestId,error:String(error?.stack??error)});}};
