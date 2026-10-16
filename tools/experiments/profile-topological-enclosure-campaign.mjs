import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {serialize} from '../../src/persistence/snapshots.js';
import {AGRICULTURAL_PROFILE_LIMITS,agriculturalRayClear} from
  '../../src/simulation/raid-agricultural-impact.js';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import {createSpatialIntentBridge} from '../../src/world/hierarchical-wasm/spatial-intent-bridge.js';
import {createCropEnclosurePlanner} from '../../src/world/hierarchical-wasm/spatial-crop-enclosure-plan.js';
import {approximateCutModules,cropClearanceHull,inspectSelfClosedQuote,
  inspectPlacedNaturalJunctions,inspectStaticCutBoundary,
  placedEnclosureJunctions} from '../../src/world/hierarchical-wasm/spatial-topological-enclosure-prototype.js';
import {wallSpec} from '../../src/simulation/rules.js';
import {wallCollisionPolygon} from '../../src/world/wall-collision-frame.js';
import {edgeDistance,footprintDistance} from '../../src/world/footprints.js';
import {ANIMAL_SPATIAL_PROFILES} from '../../src/world/hierarchical-wasm/spatial-movement-profiles.js';
import * as Game from '../../src/simulation/game.js';

const biome=process.argv[2]??'sabana',day=Number(process.argv[3]??3);
const output=process.argv[4]??`.cache/topological-${biome}-d${day}.json`;
const breach=process.argv[5]==='breach';
const cutOnly=process.argv.includes('--cut-only');
const conservativeCut=process.argv.includes('--conservative-cut');
const compareCut=process.argv.includes('--compare-cut');
const compareConstructionCut=process.argv.includes('--compare-construction-cut');
const attackEnvelopeProbe=process.argv.includes('--attack-envelope');
if(compareConstructionCut&&!conservativeCut)
  throw Error('Construction comparison requires --conservative-cut');
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
  const cut=(useConservative=conservativeCut,constructionAware=false)=>{
    if(typeof wasm.lazy_local_crop_cut!=='function')return {status:'not-built'};
    const cropTargets=group.cropIds.map(id=>state.plants.find(item=>item.id===id))
      .filter(Boolean);
    const cropPoints=cropTargets.map(item=>[Math.round(item.x),Math.round(item.z)]);
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
    const count=useConservative?
      (constructionAware?wasm.lazy_local_crop_cut_conservative_buildable:
        wasm.lazy_local_crop_cut_conservative)(...box,cropPoints.length,2):
      wasm.lazy_local_crop_cut(...box,cropPoints.length,2);
    const topologicalMs=performance.now()-started;
    const edges=count>=0?Array.from(new Int32Array(wasm.memory.buffer,
      wasm.lazy_local_crop_cut_ptr(),count*4)):[];
    const boundaryCount=cutOnly&&count>=0?
      wasm.lazy_local_crop_cut_boundary_count():0;
    const boundary=boundaryCount?Array.from(new Int32Array(wasm.memory.buffer,
      wasm.lazy_local_crop_cut_boundary_ptr(),boundaryCount*4)):[];
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
      const placedJunctionSpans=cutOnly&&placedJunctions.status==='ready'?
        new Map(placedJunctions.junctions.map(junction=>[
          `${junction.strokeIndex}:${junction.end}`,
          wasm.spatial_static_object_clearance(junction.point[0],
            junction.point[1],4)])):undefined;
      terminalContext=cutOnly?terminalContextFor(placedJunctions.junctions):undefined;
      const workerTargets=cutOnly?[...new Map(state.plants.filter(item=>
        item.alive&&group.cropIds.includes(item.id)).map(item=>
        [item.centerId,item])).values()]:[];
      const workerAccess=(targets=workerTargets)=>targets.map(crop=>{
        const center=state.structures.find(item=>item.id===crop.centerId);
        const village=state.villages.find(item=>item.id===center?.villageId);
        if(!village)return {cropId:crop.id,centerId:crop.centerId,
          status:'unknown'};
        try{return {cropId:crop.id,centerId:crop.centerId,status:nav.path(
          village.entry??village,crop,.28,null,true)?'reachable':'blocked'};}
        catch(error){
          if(error.name!=='SpatialChunkUnavailable')throw error;
          return {cropId:crop.id,centerId:crop.centerId,status:'unknown'};
        }
      });
      const workerAccessAll=()=>{
        const rows=workerAccess(cropTargets);
        const counts={reachable:0,blocked:0,unknown:0};
        for(const row of rows)counts[row.status]++;
        const returns={reachable:0,blocked:0,unknown:0};
        const returnFailures=[];
        for(const crop of cropTargets){
          const center=state.structures.find(item=>item.id===crop.centerId);
          const village=state.villages.find(item=>item.id===center?.villageId);
          let status='unknown';
          if(village)try{status=nav.path(crop,village.entry??village,
            .28,null,true)?'reachable':'blocked';}
          catch(error){if(error.name!=='SpatialChunkUnavailable')throw error;}
          returns[status]++;
          if(status!=='reachable'&&returnFailures.length<8)
            returnFailures.push({cropId:crop.id,status});
        }
        return {outbound:counts,return:returns,
          examples:rows.filter(row=>row.status!=='reachable').slice(0,8),
          returnFailures};
      };
      const beforeWorkerAccess=cutOnly?workerAccess():undefined;
      const gridProbe=()=>{
        const [sx,sz]=cropPoints[0],bySpecies={};
        // The native preview contains the quoted barriers, but the live JS
        // obstacle list does not. Mirror only the quoted structures for this
        // read-only agricultural ray probe; otherwise it tests the old farm.
        const attackState={...state,
          structures:[...state.structures,...quote.previewPieces]};
        const attackNav={...nav,
          obstacles:[...nav.obstacles,...quote.previewPieces]};
        for(const species of ['warthog','hyena','buffalo','lion','rhino']){
          opening.session.actorSectorRevision({worker:false,species});
          const counts={sealed:0,uncertified:0,blocked:0,unexpected:0};
          for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++){
            const result=wasm.lazy_enclosure(sx+dx,sz+dz);
            counts[result===1?'sealed':result===0?'blocked':
              result===-1?'uncertified':'unexpected']++;
          }
          const crops={sealedNeighborhood:0,uncertifiedNeighborhood:0,
            noPassableCell:0,anchoredSealed:0,anchoredUncertified:0,
            noPhysicalAnchor:0,centerStandable:0,
            noAnchorCenterStandable:0,
            standableNoAnchorExamples:[]};
          const attackRing={cropsWithoutCenterAnchor:0,
            cropsNearBoundary:0,
            standableSealed:0,standableOpen:0,standableUnknown:0,
            noStandablePoint:0,openExamples:[]};
          const attackEnvelope={testedCrops:0,openStandable:0,
            openClearRay:0,openBlockedRay:0,unknownStandable:0,
            directReachClear:0,minimumClearRayDistance:null,
            clearRayCrossesSolidProp:0,propQueryUnknown:0,
            potentialPeripheralCenters:0,peripheralExamples:[],
            clearExamples:[],propExamples:[]};
          const cropBoundary={withinAttackReach:0,minimumDistance:Infinity,
            nearestExamples:[]};
          for(const [index,[cx,cz]] of cropPoints.entries()){
            let sealed=false,uncertified=false,anchoredSealed=false,
              anchoredUncertified=false;
            const target=cropTargets[index];
            const centerStandable=opening.session.actorCanStand(target,
              {worker:false,species});
            if(centerStandable)crops.centerStandable++;
            let nearest=Infinity;
            for(let edge=0;edge<boundary.length;edge+=4){
              const [ox,oz,ix,iz]=boundary.slice(edge,edge+4);
              const vertical=ox!==ix;
              const fixed=vertical?(ox+ix)/2:(oz+iz)/2;
              const low=(vertical?iz:ix)-.5,high=low+1;
              const along=vertical?target.z:target.x;
              nearest=Math.min(nearest,Math.hypot(
                (vertical?target.x:target.z)-fixed,
                Math.max(low-along,0,along-high)));
            }
            cropBoundary.minimumDistance=Math.min(cropBoundary.minimumDistance,nearest);
            if(nearest<=.6+ANIMAL_SPATIAL_PROFILES[species].radius){
              cropBoundary.withinAttackReach++;
              if(cropBoundary.nearestExamples.length<8)
                cropBoundary.nearestExamples.push({cropId:target.id,distance:nearest});
            }
            for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
              const result=wasm.lazy_enclosure(cx+dx,cz+dz);
              if(result===1)sealed=true;
              if(result===-1)uncertified=true;
              if(!wasm.spatial_local_clear(target.x,target.z,
                cx+dx,cz+dz))continue;
              if(result===1)anchoredSealed=true;
              if(result===-1)anchoredUncertified=true;
            }
            crops[uncertified?'uncertifiedNeighborhood':sealed?
              'sealedNeighborhood':'noPassableCell']++;
            crops[anchoredUncertified?'anchoredUncertified':anchoredSealed?
              'anchoredSealed':'noPhysicalAnchor']++;
            const noAnchor=!anchoredSealed&&!anchoredUncertified;
            if(noAnchor&&centerStandable){
              crops.noAnchorCenterStandable++;
              if(crops.standableNoAnchorExamples.length<4){
                const nearby=[];
                for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
                  const x=cx+dx,z=cz+dz;
                  if(Math.hypot(x-target.x,z-target.z)>1.51)continue;
                  nearby.push({x,z,enclosure:wasm.lazy_enclosure(x,z),
                    standable:opening.session.actorCanStand({x,z},
                      {worker:false,species}),
                    localClear:Boolean(wasm.spatial_local_clear(
                      target.x,target.z,x,z))});
                }
                crops.standableNoAnchorExamples.push({cropId:target.id,
                  x:target.x,z:target.z,nearby});
              }
            }
            const radius=.6+ANIMAL_SPATIAL_PROFILES[species].radius;
            if(noAnchor)attackRing.cropsWithoutCenterAnchor++;
            if(nearest<=radius)attackRing.cropsNearBoundary++;
            if(noAnchor||nearest<=radius){
              let standable=false;
              for(let sample=0;sample<128;sample++){
                const angle=sample*Math.PI/64;
                const point={x:target.x+Math.sin(angle)*radius,
                  z:target.z+Math.cos(angle)*radius};
                if(!opening.session.actorCanStand(point,{worker:false,species}))continue;
                standable=true;
                const enclosure=opening.session.actorEnclosure(point,
                  {worker:false,species});
                if(enclosure.status==='sealed')attackRing.standableSealed++;
                else if(enclosure.status==='open-frontier'){
                  attackRing.standableOpen++;
                  if(attackRing.openExamples.length<8)
                    attackRing.openExamples.push({cropId:target.id,point});
                }else attackRing.standableUnknown++;
              }
              if(!standable)attackRing.noStandablePoint++;
            }
            const maxReach=radius+AGRICULTURAL_PROFILE_LIMITS.attackRadius;
            if(attackEnvelopeProbe&&nearest<=maxReach){
              attackEnvelope.testedCrops++;
              for(const distance of [radius,radius+.5,radius+1,radius+2,
                maxReach]){
                if(distance>maxReach)continue;
                for(let sample=0;sample<64;sample++){
                  const angle=sample*Math.PI/32;
                  const point={x:target.x+Math.sin(angle)*distance,
                    z:target.z+Math.cos(angle)*distance};
                  if(!opening.session.actorCanStand(point,
                    {worker:false,species}))continue;
                  const enclosure=opening.session.actorEnclosure(point,
                    {worker:false,species});
                  if(enclosure.status!=='open-frontier'){
                    if(enclosure.status!=='sealed')attackEnvelope.unknownStandable++;
                    continue;
                  }
                  attackEnvelope.openStandable++;
                  if(agriculturalRayClear(attackState,attackNav,point,target)){
                    attackEnvelope.openClearRay++;
                    if(distance<=radius+1e-8)attackEnvelope.directReachClear++;
                    attackEnvelope.minimumClearRayDistance=Math.min(
                      attackEnvelope.minimumClearRayDistance??Infinity,distance);
                    const central=state.plants.find(other=>{
                      if(!other.alive||other.id===target.id)return false;
                      const ax=other.x-point.x,az=other.z-point.z;
                      const bx=target.x-other.x,bz=target.z-other.z;
                      const centralDistance=Math.hypot(ax,az);
                      const peripheralDistance=Math.hypot(bx,bz);
                      return centralDistance<=radius+1e-8&&
                        peripheralDistance<=AGRICULTURAL_PROFILE_LIMITS.attackRadius&&
                        (centralDistance<=1e-8||peripheralDistance<=1e-8||
                          (ax*bx+az*bz)/(centralDistance*peripheralDistance)>=
                            Math.SQRT1_2-1e-8)&&
                        agriculturalRayClear(attackState,attackNav,point,other)&&
                        agriculturalRayClear(attackState,attackNav,other,target);
                    });
                    if(central){
                      attackEnvelope.potentialPeripheralCenters++;
                      if(attackEnvelope.peripheralExamples.length<8)
                        attackEnvelope.peripheralExamples.push({cropId:target.id,
                          centralId:central.id,point,distance});
                    }
                    try{
                      const midX=(point.x+target.x)/2,midZ=(point.z+target.z)/2;
                      const crossing=nav.propsAt(midX,midZ,distance/2+4).find(prop=>
                        (prop.slot<4||prop.slot>=10&&prop.slot<=12||
                          prop.slot>=18)&&edgeDistance(point,target,
                          prop.x,prop.z)<(prop.radius??1.5));
                      if(crossing){
                        attackEnvelope.clearRayCrossesSolidProp++;
                        if(attackEnvelope.propExamples.length<8)
                          attackEnvelope.propExamples.push({cropId:target.id,
                            point,distance,propId:crossing.id,slot:crossing.slot});
                      }
                    }catch(error){
                      if(error.name!=='SpatialChunkUnavailable')throw error;
                      attackEnvelope.propQueryUnknown++;
                    }
                    if(attackEnvelope.clearExamples.length<8)
                      attackEnvelope.clearExamples.push({cropId:target.id,point,
                        distance});
                  }else attackEnvelope.openBlockedRay++;
                }
              }
            }
          }
          bySpecies[species]={firstCropCells:counts,crops,attackRing,
            attackEnvelope:attackEnvelopeProbe?attackEnvelope:undefined,
            cropBoundary};
        }
        return {center:[sx,sz],bySpecies};
      };
      const crossingProbe=()=>{
        const bySpecies={};
        for(const species of ['warthog','hyena','buffalo','lion','rhino']){
          let clear=0;
          const examples=[];
          for(let i=0;i<edges.length;i+=4){
            const [ox,oz,ix,iz]=edges.slice(i,i+4);
            const tx=-(iz-oz),tz=ix-ox;
            for(const offset of [-.4,-.2,0,.2,.4]){
              const start={x:ox+tx*offset,z:oz+tz*offset};
              const end={x:ix+tx*offset,z:iz+tz*offset};
              if(!opening.session.actorStepClear(start,end,
                {worker:false,species}))continue;
              clear++;
              if(examples.length<4)examples.push({edge:i/4,offset});
            }
          }
          bySpecies[species]={tested:count*5,clear,examples};
        }
        return bySpecies;
      };
      const boundaryGapScan=()=>{
        const bySpecies={};
        for(const species of ['warthog','hyena','buffalo','lion','rhino']){
          let open=0;
          const examples=[];
          for(let i=0;i<boundary.length;i+=4){
            const [ox,oz,ix,iz]=boundary.slice(i,i+4);
            const x=(ox+ix)/2,z=(oz+iz)/2;
            const start={x:x+(ox-ix)*.3,z:z+(oz-iz)*.3};
            const end={x:x+(ix-ox)*.3,z:z+(iz-oz)*.3};
            if(!opening.session.actorStepClear(start,end,
              {worker:false,species}))continue;
            open++;
            if(examples.length<12)examples.push({segment:i/4,edge:[ox,oz,ix,iz]});
          }
          bySpecies[species]={tested:boundaryCount,open,examples};
        }
        return bySpecies;
      };
      const beforeCutCrossings=cutOnly?crossingProbe():undefined;
      const preview=nav.withWallPreview(quote.previewPieces,quote.suppressed,()=>{
        const naturalBoundary=cutOnly?(()=>{
          const counts={solid:0,wetland:0,unknown:0},uncovered=[],
            wetlandExamples=[];
          for(let edge=0;edge<boundary.length;edge+=4){
            const cells=boundary.slice(edge,edge+4);
            const kind=wasm.lazy_cut_face_natural(...cells);
            if(kind===1)counts.solid++;
            else if(kind===2){
              counts.wetland++;
              if(wetlandExamples.length<8)wetlandExamples.push(cells);
            }
            else{
              counts.unknown++;
              if(uncovered.length<8)uncovered.push({edge:edge/4,cells,kind});
            }
          }
          return {status:counts.unknown?'unknown':'blocked-by-native-natural',
            ...counts,wetlandExamples,uncovered};
        })():undefined;
        const staticBoundary=cutOnly?inspectStaticCutBoundary(boundary,(x,z)=>
          wasm.spatial_static_object_clearance(x,z,2)):undefined;
        if(staticBoundary?.status==='unknown'&&staticBoundary.edge){
          const [ox,oz,ix,iz]=staticBoundary.edge;
          const tx=-(iz-oz),tz=ix-ox;
          staticBoundary.nativeCrossings=
            Object.fromEntries(['warthog','hyena','buffalo','lion','rhino']
              .map(species=>[species,[-.4,-.2,0,.2,.4].map(offset=>{
                const start={x:ox+tx*offset,z:oz+tz*offset};
                const end={x:ix+tx*offset,z:iz+tz*offset};
                const options={worker:false,species};
                return {offset,outside:opening.session.actorCanStand(start,options),
                  outsideTerrain:nav.terrainValid(start.x,start.z,
                    ANIMAL_SPATIAL_PROFILES[species].radius,false),
                  outsideStaticClearance:wasm.spatial_static_object_clearance(
                    start.x,start.z,2),
                  inside:opening.session.actorCanStand(end,options),
                  crossing:opening.session.actorStepClear(start,end,options)};
              })]));
          const [[ax,az],[bx,bz]]=staticBoundary.endpoints;
          staticBoundary.shortBoundaryCrossings=
            Object.fromEntries(['warthog','hyena','buffalo','lion','rhino']
              .map(species=>[species,[-.4,-.2,0,.2,.4].map(offset=>{
                const x=(ax+bx)/2+(bx-ax)*offset;
                const z=(az+bz)/2+(bz-az)*offset;
                const start={x:x+(ox-ix)*.3,z:z+(oz-iz)*.3};
                const end={x:x+(ix-ox)*.3,z:z+(iz-oz)*.3};
                const options={worker:false,species};
                return {offset,outside:opening.session.actorCanStand(start,options),
                  inside:opening.session.actorCanStand(end,options),
                  crossing:opening.session.actorStepClear(start,end,options)};
              })]));
        }
        return {
        group:bridge.getUnprotectedCropGroups({includeProtected:true})
          .find(item=>item.id===group.id),
        workerAccess:cutOnly?workerAccess():undefined,
        workerAccessAll:cutOnly&&useConservative?workerAccessAll():undefined,
        gridProbe:cutOnly?gridProbe():undefined,
        naturalBoundary,
        staticBoundary,
        placedNaturalJunctions:cutOnly&&placedJunctionSpans?
          inspectPlacedNaturalJunctions(quote,junction=>
            placedJunctionSpans.get(`${junction.strokeIndex}:${junction.end}`),
          naturalBoundary?.status==='blocked-by-native-natural'):undefined,
        boundaryGapScan:cutOnly?boundaryGapScan():undefined,
        cutCrossings:cutOnly?crossingProbe():undefined};
      },true);
      const groupAfter=preview.group;
      validationMs=performance.now()-validateStarted;
      physical={status:groupAfter?.protection??'unknown',
        frontierStatus:preview.boundaryGapScan&&Object.values(
          preview.boundaryGapScan).some(result=>result.open>0)?
          'locally-open':'unverified',
        profiles:groupAfter?.profiles,modules:quote.pieces.length,
        cost:quote.cost,gates:quote.gates,
        suppressed:cutOnly?quote.suppressed:undefined,
        placedPieces:cutOnly?quote.pieces.map(({x,z,yaw,baseScaleX})=>
          ({x,z,yaw,baseScaleX})):undefined,
        structural:inspectSelfClosedQuote(quote,state.structures,
          cropPoints.map(([x,z])=>({x,z}))),
        placedJunctions,
        workerAccess:cutOnly?{before:beforeWorkerAccess,
          after:preview.workerAccess}:undefined,
        workerAccessAll:preview.workerAccessAll,
        gridProbe:preview.gridProbe,
        naturalBoundary:preview.naturalBoundary,
        staticBoundary:preview.staticBoundary,
        placedNaturalJunctions:preview.placedNaturalJunctions,
        boundaryGapScan:preview.boundaryGapScan,
        cutCrossings:cutOnly?{before:beforeCutCrossings,
          after:preview.cutCrossings}:undefined,
        blockedPieces:quote.blockedPieces.length,
        blockedPieceDetails:cutOnly?quote.blockedPieces.map(piece=>({
          x:piece.x,z:piece.z,
          wetlandMask:wasm.spatial_world_biome()===4?
            wasm.spatial_wetland_mask_anywhere(piece.x,piece.z):undefined,
          ...nav.wallPlacement(piece)})):undefined,
        blockedCrops:quote.blockedCrops.length};
    }
    return {status:count===-1?'unknown':count===-2?'unsupported':'proposed',
      conservativeCut:useConservative,constructionAware,
      box,topologicalMs,conversionMs,validationMs,cutEdges:count,
      boundarySegments:cutOnly?boundaryCount:undefined,
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
  for(const name of (compareConstructionCut?['cut-conservative',
    'cut-buildable','cut-buildable','cut-conservative']:
    compareCut?['cut','cut-conservative',
    'cut-conservative','cut']:cutOnly?['cut']:
    ['old','hull','cut','cut','hull','old'])){
    const before={...calls},beforeUpdates=updates();
    const started=performance.now(),result=name==='old'?old():
      name==='hull'?hull():cut(name==='cut-conservative'||
        name==='cut-buildable'||conservativeCut,name==='cut-buildable');
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
          observedBiome:state.biome,
          nativeBiomeCode:opening.session.core.wasm.spatial_world_biome(),
          terrainSamples:[[0,0],[24,0],[0,24],[24,24]].map(([x,z])=>
            nav.field.surface(x,z)),
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
