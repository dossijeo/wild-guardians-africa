import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {serialize} from '../../src/persistence/snapshots.js';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import {createSpatialIntentBridge} from '../../src/world/hierarchical-wasm/spatial-intent-bridge.js';
import {createCropEnclosurePlanner} from '../../src/world/hierarchical-wasm/spatial-crop-enclosure-plan.js';
import {approximateCutModules,cropClearanceHull,inspectSelfClosedQuote,
  placedEnclosureJunctions} from '../../src/world/hierarchical-wasm/spatial-topological-enclosure-prototype.js';
import {wallSpec} from '../../src/simulation/rules.js';
import {wallCollisionPolygon} from '../../src/world/wall-collision-frame.js';
import {footprintDistance} from '../../src/world/footprints.js';
import * as Game from '../../src/simulation/game.js';

const biome=process.argv[2]??'sabana',day=Number(process.argv[3]??3);
const output=process.argv[4]??`.cache/topological-${biome}-d${day}.json`;
const breach=process.argv[5]==='breach';
const cutOnly=process.argv.includes('--cut-only');
if(!Number.isInteger(day)||day<1||day>30)throw RangeError('Invalid target day');
const wasmPath=process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM??
  'src/world/hierarchical-wasm/spatial-savanna.wasm';
const binary=readFileSync(wasmPath),module=new WebAssembly.Module(binary);
if(WebAssembly.Module.imports(module).some(item=>item.module==='wasi_snapshot_preview1')){
  const Instance=WebAssembly.Instance;
  WebAssembly.Instance=function(mod,imports){return new Instance(mod,{
    ...imports,wasi_snapshot_preview1:{proc_exit(code){throw Error(`WASM exited: ${code}`);}}});};
}
const sha256=data=>createHash('sha256').update(data).digest('hex');
const end=new Error('Sample captured');let opening,sample=null;
const campaignTiming={ticks:0,decisionMs:0,gameTickMs:0};
const openingFactory=async options=>{
  opening=await createSpatialCampaignOpening(options);return opening;
};
const entryDriverFactory=nav=>({
  async advancePresentation(){if(nav.raidEntryFailure)throw Error('Native entry failed');},
  async waitForEntry(){if(nav.raidEntryFailure)throw Error('Native entry failed');},
  report(){return {mode:'profile-no-presentation'};},async dispose(){}
});
function inspect(state,nav){
  const bridge=createSpatialIntentBridge(opening.session);
  bridge.resetFromState(state); // The sample ends here; the campaign never resumes.
  let groups=bridge.getUnprotectedCropGroups();
  let group=groups.find(item=>item.protection==='unprotected');
  const removed=[];
  if(!group&&breach){
    const protectedGroup=groups.find(item=>item.protection==='protected');
    if(protectedGroup){
      const cx=(protectedGroup.bounds.minX+protectedGroup.bounds.maxX)/2;
      const cz=(protectedGroup.bounds.minZ+protectedGroup.bounds.maxZ)/2;
      const walls=state.structures.filter(item=>item.kind==='wall'&&item.hp>0&&
        item.status==='intact').sort((a,b)=>
          Math.hypot(a.x-cx,a.z-cz)-Math.hypot(b.x-cx,b.z-cz)||
          a.id.localeCompare(b.id));
      for(const wall of walls.slice(0,8)){
        if(!Game.removeWall(state,`topological-probe-${removed.length}`,
          wall.id,nav))continue;
        removed.push(wall.id);bridge.resetFromState(state);
        groups=bridge.getUnprotectedCropGroups();
        group=groups.find(item=>item.protection==='unprotected');
        if(group)break;
      }
    }
  }
  if(!group)return {status:'no-unprotected-group',groups:groups.length,
    groupStatuses:groups.map(item=>({id:item.id,protection:item.protection,
      profiles:item.profiles})),removedWalls:removed};
  const wasm=opening.session.core.wasm;
  const calls={path:0,wallPlacement:0,withWallPreview:0};
  for(const [owner,key] of [[nav,'path'],[nav,'wallPlacement'],
    [nav,'withWallPreview']]){
    const original=owner[key];owner[key]=(...args)=>{
      calls[key]++;return original(...args);
    };
  }
  const old=()=>createCropEnclosurePlanner(state,nav,bridge)
    .planCropEnclosure(group.id);
  const hull=()=>{
    const points=group.cropIds.map(id=>state.plants.find(item=>item.id===id))
      .filter(item=>item?.alive).map(({x,z})=>({x,z}));
    const geometryStart=performance.now();
    const contour=cropClearanceHull(points,2.5);
    const geometryMs=performance.now()-geometryStart;
    const quoteStart=performance.now();
    const quote=Game.quoteWallChain(state,'zarzas',contour,nav,
      {smooth:false,snap:false});
    const quoteMs=performance.now()-quoteStart;
    const structural=inspectSelfClosedQuote(quote,state.structures,points);
    let protection='unverified',validationMs=0;
    if(structural.status==='closed-wall-loop'){
      const start=performance.now();
      protection=nav.withWallPreview(quote.previewPieces,quote.suppressed,()=>
        bridge.getUnprotectedCropGroups({includeProtected:true})
          .find(item=>item.id===group.id)?.protection??'unknown',true);
      validationMs=performance.now()-start;
    }
    return {status:structural.status,protection,vertices:contour.length-1,
      modules:quote.pieces.length,cost:quote.cost,
      gaps:quote.blockedPieces.length+quote.blockedCrops.length,
      gates:quote.gates,geometryMs,quoteMs,validationMs};
  };
  const cut=()=>{
    if(typeof wasm.lazy_local_crop_cut!=='function')return {status:'not-built'};
    const cropPoints=group.cropIds.map(id=>state.plants.find(item=>item.id===id))
      .filter(Boolean).map(item=>[Math.round(item.x),Math.round(item.z)]);
    for(const species of ['warthog','hyena','buffalo','lion','rhino'])
      opening.session.actorRegionsBatch([cropPoints[0]&&{
        x:cropPoints[0][0],z:cropPoints[0][1]}],{worker:false,species});
    const pointer=wasm.lazy_cut_seeds_ptr(cropPoints.length);
    if(!pointer)return {status:'unsupported-seed-count'};
    new Int32Array(wasm.memory.buffer,pointer,cropPoints.length*2)
      .set(cropPoints.flat());
    const margin=12,b=group.bounds;
    const box=[Math.floor(b.minX-margin),Math.floor(b.minZ-margin),
      Math.ceil(b.maxX+margin)+1,Math.ceil(b.maxZ+margin)+1];
    const started=performance.now();
    const count=wasm.lazy_local_crop_cut(...box,cropPoints.length,2);
    const topologicalMs=performance.now()-started;
    const edges=count>=0?Array.from(new Int32Array(wasm.memory.buffer,
      wasm.lazy_local_crop_cut_ptr(),count*4)):[];
    const flow=wasm.lazy_local_crop_cut_flow(),cells=wasm.lazy_local_crop_cut_cells();
    const convertStarted=performance.now();
    const shape=count>=0?approximateCutModules(edges,state.structures,'zarzas',
      wallSpec('zarzas').cost):null;
    const conversionMs=performance.now()-convertStarted;
    const proposal=shape&&!shape.ambiguous.length?shape.strokes:null;
    const terminalContextFor=junctions=>junctions.map(({point})=>{
      const [x,z]=point;
      let props;
      try{props=nav.propsAt(x,z,4).filter(p=>p.slot<4||
        p.slot>=10&&p.slot<=12||p.slot>=18).map(p=>({
        x:p.x,z:p.z,radius:p.radius,slot:p.slot,
        clearSpan:Math.hypot(p.x-x,p.z-z)-(p.radius??1.5)}))
        .sort((a,b)=>a.clearSpan-b.clearSpan).slice(0,3);}
      catch(error){
        if(error.name!=='SpatialChunkUnavailable')throw error;
        props='unknown';
      }
      const obstacles=nav.obstacles.filter(o=>
        Math.hypot(o.x-x,o.z-z)<(o.radius??3)+4)
        .map(o=>({id:o.id,kind:o.kind,x:o.x,z:o.z,radius:o.radius,
          gate:o.gate,status:o.status,
          pointToSurface:o.kind==='wall'?
            footprintDistance(wallCollisionPolygon(o,0),x,z):o.footprint?
              footprintDistance(o.footprint,x,z):
              Math.max(0,Math.hypot(o.x-x,o.z-z)-(o.radius??0))}))
        .sort((a,b)=>a.pointToSurface-b.pointToSurface);
      const terrainBlocks=[];
      for(let i=0;i<16;i++){
        const angle=i*Math.PI/8;
        for(let distance=.25;distance<=3;distance+=.25){
          if(!nav.terrainValid(x+Math.cos(angle)*distance,
            z+Math.sin(angle)*distance,.85,false)){
            terrainBlocks.push(distance);break;
          }
        }
      }
      return {point,props,obstacles,
        terrainValid:nav.terrainValid(x,z,.85,false),
        nearestTerrainBlock:terrainBlocks.length?Math.min(...terrainBlocks):null,
        nativeObjectClearance:wasm.spatial_static_object_clearance?.(x,z,4)};
    });
    let validationMs=0,physical=null,terminalContext;
    if(proposal){
      const validateStarted=performance.now();
      const quote=Game.quoteWallChain(state,'zarzas',proposal,nav,
        {smooth:false,snap:false});
      const placedJunctions=cutOnly?placedEnclosureJunctions(quote):undefined;
      terminalContext=cutOnly?terminalContextFor(placedJunctions.junctions):undefined;
      const workerTargets=cutOnly?[...new Map(state.plants.filter(item=>
        item.alive&&group.cropIds.includes(item.id)).map(item=>
        [item.centerId,item])).values()]:[];
      const workerAccess=()=>workerTargets.map(crop=>{
        const center=state.structures.find(item=>item.id===crop.centerId);
        const village=state.villages.find(item=>item.id===center?.villageId);
        if(!village)return {centerId:crop.centerId,status:'unknown'};
        try{return {centerId:crop.centerId,status:nav.path(
          village.entry??village,crop,.28,null,true)?'reachable':'blocked'};}
        catch(error){
          if(error.name!=='SpatialChunkUnavailable')throw error;
          return {centerId:crop.centerId,status:'unknown'};
        }
      });
      const beforeWorkerAccess=cutOnly?workerAccess():undefined;
      const preview=nav.withWallPreview(quote.previewPieces,quote.suppressed,()=>({
        group:bridge.getUnprotectedCropGroups({includeProtected:true})
          .find(item=>item.id===group.id),
        workerAccess:cutOnly?workerAccess():undefined}),true);
      const groupAfter=preview.group;
      validationMs=performance.now()-validateStarted;
      physical={status:groupAfter?.protection??'unknown',
        profiles:groupAfter?.profiles,modules:quote.pieces.length,
        cost:quote.cost,gates:quote.gates,
        placedPieces:cutOnly?quote.pieces.map(({x,z,yaw,baseScaleX})=>
          ({x,z,yaw,baseScaleX})):undefined,
        structural:inspectSelfClosedQuote(quote,state.structures,
          cropPoints.map(([x,z])=>({x,z}))),
        placedJunctions,
        workerAccess:cutOnly?{before:beforeWorkerAccess,
          after:preview.workerAccess}:undefined,
        blockedPieces:quote.blockedPieces.length,
        blockedCrops:quote.blockedCrops.length};
    }
    return {status:count===-1?'unknown':count===-2?'unsupported':'proposed',
      box,topologicalMs,conversionMs,validationMs,cutEdges:count,
      flow,cells,
      strokes:shape?.strokes.length,estimatedModules:shape?.slots.length,
      estimatedCost:shape?.estimatedCost,ambiguous:shape?.ambiguous.length,
      junctions:shape?.junctions.length,
      terminals:shape?.junctions.map(({strokeIndex,end,point})=>({strokeIndex,end,point})),
      terminalContext,
      contours:cutOnly?shape?.strokes:undefined,
      multiArc:proposal?.length>1,physical};
  };
  const updates=()=>{
    let total=0;
    for(const species of ['warthog','hyena','buffalo','lion','rhino']){
      opening.session.actorSectorRevision({worker:false,species});
      total+=wasm.lazy_sector_updates();
    }
    opening.session.actorSectorRevision({worker:true});
    return total+wasm.lazy_sector_updates();
  };
  const rows=[];
  for(const name of (cutOnly?['cut']:['old','hull','cut','cut','hull','old'])){
    const before={...calls},beforeUpdates=updates();
    const started=performance.now(),result=name==='old'?old():name==='hull'?hull():cut();
    rows.push({name,ms:performance.now()-started,...(name==='old'?{
      status:result.status,modules:result.modules?.length,cost:result.cost,
      gaps:result.gaps?.length}:result),
      calls:Object.fromEntries(Object.keys(calls).map(key=>[key,calls[key]-before[key]])),
      sectorUpdates:updates()-beforeUpdates});
  }
  return {status:'measured',groupId:group.id,cropCount:group.cropIds.length,
    groupBounds:group.bounds,removedWalls:removed,
    existingGates:cutOnly?state.structures.filter(item=>item.kind==='wall'&&
      item.gate&&item.status!=='ruined').map(item=>({id:item.id,x:item.x,
        z:item.z,autoGate:item.autoGate})):undefined,
    rows,
    memoryBytes:wasm.memory.buffer.byteLength};
}
const started=performance.now();
try{
  await simulateNativeCampaign({days:day,biome,seed:712,culture:'mapungubwe',
    strategy:'good',nativeIntents:true,spatialAdvice:true,
    defensePolicy:'expanding',nativeEvidence:false,reloadRaids:false,
    openingFactory,entryDriverFactory,onTick:(state,nav,timing)=>{
      campaignTiming.ticks++;
      campaignTiming.decisionMs+=timing.decisionMs;
      campaignTiming.gameTickMs+=timing.gameTickMs;
      nav.serviceRaidConnectivityDemand?.();
      if(!sample&&state.day===day&&state.time>=240&&state.time<300&&
          !state.raid){
        const snapshot=serialize(state);
        sample={stateHash:sha256(snapshot),living:state.plants.filter(p=>p.alive).length,
          ...inspect(state,nav)};
        throw end;
      }
    }});
}catch(error){if(error!==end)throw error;}
const report={biome,seed:712,day,source:sha256(readFileSync(
  new URL('../../src/world/hierarchical-wasm/lazy-sectors.cpp',import.meta.url))),
  wasmSha256:sha256(binary),elapsedSeconds:(performance.now()-started)/1000,
  campaignTiming,
  sample:sample??{status:'not-reached'}};
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
