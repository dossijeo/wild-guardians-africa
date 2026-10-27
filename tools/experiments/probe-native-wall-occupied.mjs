// Frozen raid selection probe. It does not advance Game.tick or mutate saves.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {targetFor} from '../../src/simulation/raids.js';

const fixture=process.argv[2]??'tests/fixtures/manglares-123-d10-raid-state.json.gz';
const binary=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM??
  'src/world/wild-engine/spatial-savanna.wasm';
const raw=readFileSync(fixture);
const state=deserialize(fixture.endsWith('.gz')?gunzipSync(raw).toString():raw.toString());
const actorId=process.argv[3],actorX=Number(process.argv[4]),
  actorZ=Number(process.argv[5]);
if(actorId){
  const actor=state.raid?.animals.find(item=>item.id===actorId);
  if(!actor||!Number.isFinite(actorX)||!Number.isFinite(actorZ))
    throw Error('Expected a saved raid actor and its pre-selection X/Z');
  if(actor.reservation&&state.raid.reservations[actor.reservation]===actor.id)
    delete state.raid.reservations[actor.reservation];
  Object.assign(actor,{x:actorX,z:actorZ,status:'waiting',targetId:null,
    reservation:null,path:null,approach:null});
}
const module=new WebAssembly.Module(readFileSync(binary));
const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const village=state.villages[0],cx=Math.floor((village.x+24)/48),
    cz=Math.floor((village.z+24)/48);
  for(let z=cz-4;z<=cz+4;z++)for(let x=cx-4;x<=cx+4;x++){
    if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
    loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const planner=createEventDrivenTaskPlanner(session);
  planner.resetFromState(state);
  planner.nativeWallSelectionEnabled=true;
  const wasm=session.core.wasm;
  const nav=createSpatialNavigationMovement(session,state);
  nav.intentTaskPlanner=planner;
  nav.raidSelectionStats={};
  const rows=[];
  const originalCrop=planner.planAttackCrop;
  const originalWall=planner.planAttackWall;
  let crop=null,wall=null;
  planner.planAttackCrop=(...args)=>(crop=originalCrop(...args));
  planner.planAttackWall=(...args)=>(wall=originalWall(...args));
  for(const animal of state.raid.animals.filter(item=>
    item.status==='waiting'&&!item.targetId)){
    crop=null;wall=null;
    const choice=targetFor(state,animal,nav);
    const groupCount=wasm.nav_intent_crop_groups(animal.radius);
    const groups=Array.from(new Float64Array(wasm.memory.buffer,
      wasm.nav_intent_crop_groups_ptr(),groupCount*12));
    const perimeter=[];
    for(let index=0;index<groupCount;index++){
      const groupId=groups[index*12];
      const status=wasm.nav_intent_perimeter_walls(animal.x,animal.z,
        animal.radius,groupId);
      const count=wasm.nav_intent_perimeter_wall_count();
      const sides=status===1?Array.from(new Float64Array(wasm.memory.buffer,
        wasm.nav_intent_perimeter_walls_ptr(),count*3)):[];
      perimeter.push({groupId,status,sites:Array.from({length:sides.length/3},
        (_,site)=>({id:sides[site*3],x:sides[site*3+1],z:sides[site*3+2]}))});
    }
    let withoutTransients,withoutNativeLeases;
    if(actorId){
      wasm.nav_intent_attack_blockers_ptr(0);
      wasm.nav_intent_attack_reserved_targets_ptr(0);
      const status=wasm.nav_intent_plan_attack_wall(
        Number(animal.id.split('-').at(-1)),animal.x,animal.z,animal.radius);
      const result=Array.from(new Float64Array(wasm.memory.buffer,
        wasm.nav_intent_wall_attack_result_ptr(),10));
      withoutTransients={status,targetId:result[1],x:result[2],z:result[3],
        candidatesExamined:result[8],routeQueries:result[9]};
      if(status===1)wasm.nav_intent_attack_cancel(
        Number(animal.id.split('-').at(-1)));
      withoutNativeLeases=[];
      for(const other of state.raid.animals){
        if(other===animal)continue;
        const removed=wasm.nav_intent_attack_cancel(
          Number(other.id.split('-').at(-1)));
        if(!removed)continue;
        const clearStatus=wasm.nav_intent_plan_attack_wall(
          Number(animal.id.split('-').at(-1)),animal.x,animal.z,animal.radius);
        const clearResult=Array.from(new Float64Array(wasm.memory.buffer,
          wasm.nav_intent_wall_attack_result_ptr(),10));
        if(clearStatus===1){
          withoutNativeLeases.push({removedActor:other.id,status:clearStatus,
            targetId:clearResult[1],x:clearResult[2],z:clearResult[3],
            candidatesExamined:clearResult[8],routeQueries:clearResult[9]});
          wasm.nav_intent_attack_cancel(Number(animal.id.split('-').at(-1)));
        }
      }
    }
    rows.push({actorId:animal.id,species:animal.species,
      crop:crop&&{status:crop.status,regionQueries:crop.regionQueries,
        routeQueries:crop.routeQueries},
      wall:wall&&{status:wall.status,targetId:wall.target?.id,
        candidatesExamined:wall.candidatesExamined,
        routeQueries:wall.routeQueries},
      choice:choice?.unknown?'unknown':choice?.target&&{
        id:choice.target.id,kind:choice.target.kind,
        native:!!choice.native,approach:choice.approach?.point},
      perimeter:actorId?perimeter:undefined,withoutTransients,
      withoutNativeLeases,
      selectedWall:actorId&&choice?.target?.kind==='wall'?
        {id:choice.target.id,x:choice.target.x,z:choice.target.z,
          yaw:choice.target.yaw,scale:choice.target.scale,
          width:choice.target.width,depth:choice.target.depth}:undefined,
      nearbyAnimals:actorId&&choice?.approach?.point?
        state.raid.animals.filter(other=>other!==animal&&
          (Math.hypot(other.x-choice.approach.point.x,
            other.z-choice.approach.point.z)<5||other.approach&&
            Math.hypot(other.approach.x-choice.approach.point.x,
              other.approach.z-choice.approach.point.z)<5))
          .map(other=>({id:other.id,status:other.status,targetId:other.targetId,
            x:other.x,z:other.z,approach:other.approach})):undefined,
      activeAnimalTargets:actorId?state.raid.animals.filter(other=>
        other!==animal&&other.status!=='gone').map(other=>({id:other.id,
        status:other.status,targetId:other.targetId,x:other.x,z:other.z,
        approach:other.approach})):undefined});
    if(choice?.target&&!choice.unknown){
      animal.targetId=choice.target.id;
      animal.reservation=choice.reservation;
      state.raid.reservations[choice.reservation]=animal.id;
      animal.approach=choice.approach.point;
    }
  }
  process.stdout.write(JSON.stringify({fixture,day:state.day,time:state.time,
    rows,selection:nav.raidSelectionStats},null,2)+'\n');
}finally{session.dispose();}
