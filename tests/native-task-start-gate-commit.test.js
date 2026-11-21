import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPlant} from '../src/simulation/crops.js';
import {nativeIdleCycleGameFixture} from './helpers/native-idle-cycle-game.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {copyNativeTaskStartProposal} from '../src/world/native-task-start-presentation.js';
import {nativeTaskStartPresentationMatches} from '../src/world/native-task-start-attestation.js';
import {copyNativeRoutePresentation} from '../src/world/native-route-presentation.js';
import {sameNativeGatePresentations} from '../src/world/native-gate-presentation.js';

// Execute the real Roster commit guard with the two boundary receipts acquired
// by Game/WASM. Compilation and queue submission belong to the Host double.
function validateTaskCommit(packet){
 const source=readFileSync(new URL('../src/rendering/webgpu-worker-roster.js',import.meta.url),'utf8');
 const entry=source.indexOf('const pickTime=()=>getPickTime(ref,packet.startTime);');
 const start=source.indexOf('   function validateCommit(data){',entry),end=source.indexOf('\n   pending.stage=',start);
 assert(entry>=0&&start>entry&&end>start);
 const create=new Function('packet','ref','matches','copyNativeRoutePresentation','sameNativeGatePresentations',`
  const farm=false,stroll=false,consequence=false,home=false,starting=true;
  const bindingKey='nativeTaskStartBinding',valid=()=>true,activated=true;
  ${source.slice(start,end)}
  return validateCommit;
 `);
 return create(packet,packet.nativeStart,nativeTaskStartPresentationMatches,copyNativeRoutePresentation,sameNativeGatePresentations);
}

test('a retimed Task14 with a real gate acquires only its exact attested motion',async()=>{
 const idle=nativeIdleCycleGameFixture({peer:false,remaining:5});
 const state=structuredClone(idle.state);idle.close();
 const worker=state.workers[0],center=state.structures.find(row=>row.id===worker.centerId);
 Object.assign(worker,{x:-14,z:5.7});
 Object.assign(center,{x:-14,z:2});
 Object.assign(state.plants.find(row=>row.id==='plant-900098'),{x:worker.x,z:worker.z});
 state.structures.push({id:'structure-1000000',created:29207,kind:'wall',material:'zarzas',gate:true,
  x:-14,z:8.2,yaw:0,hp:60,maxHp:60,status:'intact',villageId:worker.villageId,cost:10,collapseRemaining:0});
 state.nextId=1000001;
 const crop=createPlant('plant-'+state.nextId++,'mijo',-14,11.8,center.id);
 crop.growth=999999;
 for(const slot of crop.water)slot.status='manual';
 state.plants.push(crop);
 const chunkKeys=[...Array.from({length:9},(_,i)=>[i%3-1,Math.floor(i/3)-1].join(',')),'2,-1','2,0','2,1'];
 let release,heldAt,acquired;
 const hold=new Promise(resolve=>{release=resolve;});
 const f=await nativeProductionAuthority(state,{chunkKeys,
  async onReady(record){if(record.kind==='task-start'&&heldAt===undefined){heldAt=f.snapshot().elapsed;await hold;}},
  onCommit(record,data){if(record.kind==='task-start')acquired={record,data};}
 });
 try{
  await untilProduction(f,()=>f.records.some(row=>row.kind==='initial-idle-body'&&row.committed));
  assert.equal(f.command({kind:'harvest',id:'task14-gate-regression',targetId:crop.id}).value,true);
  for(let i=0;i<140&&!acquired;i++){
   const view=f.advance(.05);
   await f.present();
   assert.deepEqual(f.faults,[]);
   if(heldAt!==undefined&&view.elapsed>heldAt+.45)release();
  }
  assert(acquired);
  const {record,data}=acquired,packet=copyNativeTaskStartProposal(record.resources);
  const actual=data.resources.presentation,proof=data.nativeTaskStartBinding,validate=validateTaskCommit(packet);
  assert.deepEqual(proof.gateIds,[1000000]);
  assert(data.worldBoundary.effectiveTime>packet.worldBoundary.effectiveTime);
  assert.equal(sameNativeGatePresentations(packet.gates,actual.gates),false);
  assert.deepEqual(validate(data),copyNativeRoutePresentation(actual));

  const exact=validateTaskCommit({...actual,nativeStart:packet.nativeStart});
  assert.throws(()=>exact({...data,nativeTaskStartBinding:undefined}),/committed resources/);
  for(const change of [gate=>gate.rows[1]=.125,gate=>gate.positions[0]+=.1,gate=>gate.mechanism++]){
   const presentation=structuredClone(actual);change(presentation.gates[0]);
   assert.throws(()=>validate({...data,resources:{...data.resources,presentation}}),/committed resources/);
  }
 }finally{release();await f.close();}
});
