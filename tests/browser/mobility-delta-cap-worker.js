import {createSimulation} from './mobility-worker-simulation-core.js';import {createProjectionPublisher} from './mobility-delta-prototype.js';
const session='bounded-test',tx=createProjectionPublisher(session,{maxPendingBytes:150});let sim,held=null,ticks=0;
try{sim=await createSimulation();postMessage({kind:'ready',session});}catch(e){postMessage({kind:'error',error:String(e?.stack??e)});}
self.onmessage=({data:d})=>{try{
 if(d.kind==='step'){if(held){postMessage({kind:'step',id:d.id,advanced:false,blocked:true,ticks,status:tx.status()});return;}if(d.damage)sim.damageCenter();const result=sim.run(1,.1,{full:false});ticks++;const p=JSON.parse(result.projection);if(d.synthetic)p.events.unshift({type:'synthetic-hold',value:'x'.repeat(30)});const packet=tx.publish(p);if(packet.kind==='blocked')held=p;postMessage({kind:'step',id:d.id,advanced:true,packet,ticks,status:tx.status()});}
 else if(d.kind==='retry'){if(!held)throw Error('No held step');const packet=tx.publish(held);if(packet.kind!=='blocked')held=null;postMessage({kind:'retry',id:d.id,packet,ticks,status:tx.status()});}
 else if(d.kind==='ack')postMessage({kind:'ack',id:d.id,accepted:tx.acknowledge(d.session,d.sequence),status:tx.status()});
 else if(d.kind==='snapshot')postMessage({kind:'snapshot',id:d.id,packet:tx.snapshot(),ticks,status:tx.status()});
}catch(e){postMessage({kind:'error',id:d.id,error:String(e?.stack??e)});}};
