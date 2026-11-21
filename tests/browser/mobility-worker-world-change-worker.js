import {createWorld} from './mobility-worker-world-change.js';
let world;
try{world=await createWorld();postMessage({kind:'ready',network:world.network,chunks:world.chunks});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=event=>{const request=event.data;try{
 if(request.kind==='run'){
  const at=performance.now();postMessage({kind:'started',at:performance.timeOrigin+at});
  const clear=world.session.actorCanStand(request.point,{worker:false,species:'hyena'}),end=performance.now();
  postMessage({kind:'result',version:request.version,clear,elapsed:end-at,at:performance.timeOrigin+end});
 }else if(request.kind==='wall'){
  const {x,z}=request.point,at=performance.now(),id=world.session.core.addOrientedBarrier(x,z,1.2,1.2,0,0),clear=world.session.actorCanStand(request.point,{worker:false,species:'hyena'});
  postMessage({kind:'updated',version:request.version,id,clear,elapsed:performance.now()-at,at:performance.timeOrigin+performance.now()});
 }else if(request.kind==='remove'){
  const at=performance.now(),removed=world.session.core.removeBarrier(request.id),clear=world.session.actorCanStand(request.point,{worker:false,species:'hyena'});
  postMessage({kind:'removed',version:request.version,removed,clear,elapsed:performance.now()-at});
 }
}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}};
