import {createSimulation} from './mobility-worker-simulation-core.js';import {createProjectionPublisher} from './mobility-delta-prototype.js';
const samples=[],encoder=new TextEncoder(),capacity=65536;let mode,tx,version,sequence,pending;
try{const sim=await createSimulation();try{sim.damageCenter();for(let i=0;i<60;i++)samples.push(JSON.parse(sim.run(1,.1,{full:false}).projection));}finally{sim.dispose();}postMessage({kind:'ready'});}catch(e){postMessage({kind:'error',error:String(e?.stack??e)});}
self.onmessage=({data:d})=>{try{if(d.kind==='begin'){mode=d.mode;version=sequence=0;pending=[];tx=createProjectionPublisher('replay',{maxPendingBytes:capacity});postMessage({kind:'begun',id:d.id});return;}if(d.kind==='step'){
 const start=performance.now(),source=samples[d.index];if(!source||d.index!==version)throw Error('Unexpected index');let packet;
 if(mode==='delta'){if(!tx.acknowledge('replay',d.ack))throw Error('Invalid ack');packet=tx.publish(source);if(packet.kind!=='delta')throw Error('Capacity exceeded');version++;}
 else if(mode==='snapshot'){pending=pending.filter(e=>e.sequence>d.ack);const state=structuredClone(source),events=state.events;delete state.events;for(const event of events)pending.push({sequence:++sequence,event});if(encoder.encode(JSON.stringify(pending)).length>capacity)throw Error('Capacity exceeded');packet={kind:'snapshot',session:'replay',version:++version,state,events:structuredClone(pending)};}else throw Error('Invalid mode');
 const buildMs=performance.now()-start,byteStart=performance.now(),bytes=encoder.encode(JSON.stringify(packet)).length,byteMs=performance.now()-byteStart;postMessage({kind:'packet',id:d.id,packet,buildMs,bytes,byteMs});}
 }catch(e){postMessage({kind:'error',id:d.id,error:String(e?.stack??e)});}};
