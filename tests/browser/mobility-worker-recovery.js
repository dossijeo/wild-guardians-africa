import {createWorld} from './mobility-worker-world-change.js';
import {createWorldEventGate} from '../../tools/trees/prototype_world_event_order.mjs';
let world,gate=createWorldEventGate('original'),recovering=false;
try{world=await createWorld();postMessage({kind:'ready'});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=async event=>{const req=event.data;try{
 if(recovering){postMessage({kind:'busy',id:req.id});return;}
 if(req.kind==='recover'){
  recovering=true;const start=performance.now();
  try{if(req.fail)throw Error('Injected reconstruction failure');const replacement=await createWorld(),old=world;world=replacement;gate=createWorldEventGate('replacement');old.session.dispose();postMessage({kind:'recovered',id:req.id,elapsed:performance.now()-start});}
  finally{recovering=false;}return;
 }
 if(req.kind==='edit'){
  const result=gate.edit(req,()=>{const id=world.session.core.addOrientedBarrier(req.point.x,req.point.z,1.2,1.2,0,0);if(id<=0)throw Error('Add failed');if(req.failAfterMutation)throw Error('Injected partial failure');return id;});postMessage({kind:'result',id:req.id,...result});
 }else if(req.kind==='query'){
  const result=gate.query(req,()=>({clear:req.points.map(p=>world.session.actorCanStand(p,{worker:false,species:'hyena'})),spatial:world.session.core.snapshot()}));postMessage({kind:'result',id:req.id,...result});
 }
}catch(error){postMessage({kind:'error',id:req.id,error:String(error?.message??error)});}};
