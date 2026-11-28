import {createSimulation} from './mobility-worker-simulation-core.js';
const worker=new Worker(new URL('./mobility-worker-latest.js',import.meta.url),{type:'module'}),pending=new Map();let next=0;
const ready=new Promise((resolve,reject)=>{worker.onerror=e=>reject(Error(e.message));worker.onmessage=e=>{const data=e.data;if(data.kind==='ready')resolve(data);else if(data.kind==='error'){const p=pending.get(data.id);if(p){pending.delete(data.id);p.reject(Error(data.error));}else reject(Error(data.error));}else{const p=pending.get(data.id);if(p){pending.delete(data.id);p.resolve(data);}}};});
const request=message=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});worker.postMessage({...message,id});});
try{
 const [{session,capacity},reference]=await Promise.all([ready,createSimulation()]);
 window.runLatestAudit=async()=>{
  reference.damageCenter();
  const first=await request({kind:'advance',steps:10,damageCenter:true});reference.run(first.steps,.1,{full:false});
  const old=await request({kind:'poll'}),heldAt=performance.now(),advancing=request({kind:'advance',steps:50});await new Promise(resolve=>setTimeout(resolve,200));const heldMs=performance.now()-heldAt;
  const advance=await advancing;reference.run(advance.steps,.1,{full:false});
  const stopped=await request({kind:'advance',steps:1}),current=await request({kind:'poll'}),repeated=await request({kind:'poll'});
  const invalid=await request({kind:'ack',session,sequence:current.delivered+1}),wrong=await request({kind:'ack',session:'old',sequence:current.delivered});
  const ack=await request({kind:'ack',session,sequence:current.delivered});
  const resumed=await request({kind:'advance',steps:50-advance.steps}),final=await request({kind:'poll'});
  const expected=JSON.parse(reference.run(resumed.steps,.1,{full:false}).projection);delete expected.events;
  if(first.steps!==10||!advance.saturated||stopped.steps!==0||current.events.length!==1||current.events[0].event.type!=='StructureRuined'||JSON.stringify(current.events)!==JSON.stringify(repeated.events)||invalid.accepted||wrong.accepted||!ack.accepted||resumed.steps!==50-advance.steps||final.events.length||JSON.stringify(final.latest.projection)!==JSON.stringify(expected)||final.latest.version<=old.latest.version)throw Error('Latest-state audit failed');
  return {capacity,heldMs,first,advance,stopped,resumed,oldVersion:old.latest.version,finalVersion:final.latest.version,oldTime:old.latest.projection.elapsed,finalTime:final.latest.projection.elapsed,event:current.events[0],repeatedSequence:repeated.events[0].sequence,invalidAck:invalid.accepted,wrongSessionAck:wrong.accepted,ack:ack.accepted,finalPending:final.events.length,referenceProjectionEqual:true,scope:'One retained latest projection; pending events retained until cumulative acknowledgment. Work is explicitly requested. Soft event limit is checked between ticks; a tick may exceed it. No render or production integration.'};
 };
 window.latestReady=true;document.querySelector('#status').textContent='Preparado';
}catch(error){window.latestError=String(error?.stack??error);document.querySelector('#status').textContent=window.latestError;}
