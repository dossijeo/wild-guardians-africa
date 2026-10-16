import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createPlant} from '../../src/simulation/crops.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {createSpatialIntentBridge} from '../../src/world/hierarchical-wasm/spatial-intent-bridge.js';
import {createCropEnclosurePlanner} from '../../src/world/hierarchical-wasm/spatial-crop-enclosure-plan.js';
import {approximateCutModules,cutEdgesToStrokes,inspectSelfClosedQuote,
  inspectStaticCutBoundary,
  stitchTwoCutStrokes} from '../../src/world/hierarchical-wasm/spatial-topological-enclosure-prototype.js';
import {villageLayout} from '../../src/world/villages.js';
import {wallSpec} from '../../src/simulation/rules.js';
import * as Game from '../../src/simulation/game.js';

const wasmPath=process.argv[2]??'src/world/hierarchical-wasm/spatial-savanna.wasm';
const biome=process.argv[3]??'sabana';
const siteMode=process.argv[4]??'corner';
const conservativeCut=process.argv.includes('--conservative-cut');
const padding=Number(process.argv[7]??2);
if(!Number.isInteger(padding)||padding<0||padding>8)throw RangeError('Invalid crop padding');
const connectorLimit=Number(process.argv[8]??8);
if(!Number.isFinite(connectorLimit)||connectorLimit<0||connectorLimit>24)
  throw RangeError('Invalid diagnostic connector limit');
const module=new WebAssembly.Module(readFileSync(wasmPath));
// Ubuntu's Emscripten 3.1.5 emits an unused WASI exit import in standalone
// builds. Keep the compatibility shim inside this benchmark process only.
if(WebAssembly.Module.imports(module).some(item=>item.module==='wasi_snapshot_preview1')){
  const Instance=WebAssembly.Instance;
  WebAssembly.Instance=function(mod,imports){return new Instance(mod,{
    ...imports,wasi_snapshot_preview1:{proc_exit(code){throw Error(`WASM exited: ${code}`);}}});};
}
const pack=JSON.parse(readFileSync(new URL('../../public/content/villages.json',import.meta.url),'utf8'))[0];
const state=Game.newGame({seed:712,biome,culture:'mapungubwe',slotId:'topological-cut-bench'});
state.villages[0].buildings=villageLayout(pack,0,0);
state.structures.push({id:'center-1',kind:'center',x:0,z:0,culture:'mapungubwe',
  villageId:'village-1',status:'intact',hp:600,maxHp:600});
const chunks=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>chunks,onData:data=>chunks.set(`${data.cx},${data.cz}`,data)});
try{
  const jobs=new Map();
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)jobs.set(`${x},${z}`,
    {cx:x,cz:z,score:Math.hypot(x,z)});
  session.stream.plan(jobs);await session.stream.whenIdle();
  const nav=createSpatialNavigationMovement(session,state);
  const candidates=[];
  for(let z=-13;z<=13;z++)for(let x=-13;x<=13;x++)
    if(Math.hypot(x,z)>5)candidates.push({x,z});
  const preferred=siteMode==='center'?8:-13;
  candidates.sort((a,b)=>Math.hypot(a.x-preferred,a.z-preferred)-
    Math.hypot(b.x-preferred,b.z-preferred)||
    a.x-b.x||a.z-b.z);
  let site=candidates.find(({x,z})=>nav.placement(x,z,.4).valid);
  if(siteMode==='fixed'){
    site={x:Number(process.argv[5]),z:Number(process.argv[6])};
    if(!Number.isSafeInteger(site.x)||!Number.isSafeInteger(site.z)||
      !nav.placement(site.x,site.z,.4).valid)throw Error('Invalid fixed crop site');
  }
  if(siteMode==='open'&&typeof session.core.wasm.lazy_local_crop_cut==='function'){
    for(const species of ['warthog','hyena','buffalo','lion','rhino'])
      session.actorRegionsBatch([site],{worker:false,species});
    const wasm=session.core.wasm;
    site=candidates.find(candidate=>{
      if(!nav.placement(candidate.x,candidate.z,.4).valid)return false;
      const pointer=wasm.lazy_cut_seeds_ptr(1);
      new Int32Array(wasm.memory.buffer,pointer,2).set([candidate.x,candidate.z]);
      const count=wasm.lazy_local_crop_cut(candidate.x-12,candidate.z-12,
        candidate.x+13,candidate.z+13,1,padding);
      if(count<=0)return false;
      const edges=Array.from(new Int32Array(wasm.memory.buffer,
        wasm.lazy_local_crop_cut_ptr(),count*4));
      const shape=cutEdgesToStrokes(edges);
      return shape.strokes.length===1&&!shape.ambiguous.length;
    });
  }
  if(!site)throw Error('No legal crop site in resident area');
  state.plants.push(createPlant(`plant-${state.nextId++}`,'mijo',site.x,site.z,'center-1'));
  const bridge=createSpatialIntentBridge(session);bridge.resetFromState(state);
  const group=bridge.getUnprotectedCropGroups({includeProtected:true})[0];
  if(!group)throw Error('Native crop group not created');
  const planner=createCropEnclosurePlanner(state,nav,bridge),wasm=session.core.wasm;
  const instrumentation={path:0,wallPlacement:0,withWallPreview:0};
  for(const [object,key] of [[nav,'path'],[nav,'wallPlacement'],[session,'withWallPreview']]){
    const original=object[key];object[key]=(...args)=>{
      instrumentation[key]++;return original(...args);
    };
  }
  const old=()=>planner.planCropEnclosure(group.id);
  const workerRouteStatus=()=>{
    const entry=state.villages[0].entry??state.villages[0];
    try{return {outbound:!!nav.path(entry,site,.28,null,true),
      return:!!nav.path(site,entry,.28,null,true)};}
    catch(error){
      if(error.name!=='SpatialChunkUnavailable')throw error;
      return {status:'unknown'};
    }
  };
  const cut=()=>{
    const cutStart=performance.now();
    for(const species of ['warthog','hyena','buffalo','lion','rhino'])
      session.actorRegionsBatch([site],{worker:false,species});
    const pointer=wasm.lazy_cut_seeds_ptr(1);
    new Int32Array(wasm.memory.buffer,pointer,2).set([Math.round(site.x),Math.round(site.z)]);
    const margin=12,minX=Math.floor(site.x-margin),minZ=Math.floor(site.z-margin);
    const maxX=Math.ceil(site.x+margin)+1,maxZ=Math.ceil(site.z+margin)+1;
    const result=conservativeCut?wasm.lazy_local_crop_cut_conservative(
      minX,minZ,maxX,maxZ,1,padding):wasm.lazy_local_crop_cut(
      minX,minZ,maxX,maxZ,1,padding);
    const edges=result>=0?Array.from(new Int32Array(wasm.memory.buffer,
      wasm.lazy_local_crop_cut_ptr(),result*4)):[];
    const boundaryCount=conservativeCut&&result>=0?
      wasm.lazy_local_crop_cut_boundary_count():0;
    const boundary=boundaryCount?Array.from(new Int32Array(wasm.memory.buffer,
      wasm.lazy_local_crop_cut_boundary_ptr(),boundaryCount*4)):[];
    const flow=wasm.lazy_local_crop_cut_flow(),cells=wasm.lazy_local_crop_cut_cells();
    const cutMs=performance.now()-cutStart;
    const convertStart=performance.now();
    const shape=result>=0?approximateCutModules(edges,state.structures,'zarzas',
      wallSpec('zarzas').cost):null;
    const stitched=shape&&!shape.ambiguous.length?
      conservativeCut?shape.strokes:
        stitchTwoCutStrokes(shape.strokes,connectorLimit):null;
    const convertMs=performance.now()-convertStart;
    let quote=null,certification=null,structural=null,rhinoProbe=null,
      workerRoutes=null,
      staticBoundary=null,validationMs=0;
    const workerRoutesBefore=conservativeCut?workerRouteStatus():null;
    if(stitched){
      const validateStart=performance.now();
      quote=Game.quoteWallChain(state,'zarzas',stitched,nav,
        {smooth:false,snap:false});
      structural=inspectSelfClosedQuote(quote,state.structures,[site]);
      certification=nav.withWallPreview(quote.previewPieces,quote.suppressed,()=>{
        if(conservativeCut)staticBoundary=quote.suppressed.length?
          {status:'unknown',reason:'suppressed-static-obstacle'}:
          inspectStaticCutBoundary(boundary,(x,z)=>
            wasm.spatial_static_object_clearance(x,z,2));
        if(conservativeCut)workerRoutes=workerRouteStatus();
        const assessed=bridge.getUnprotectedCropGroups({includeProtected:true})
          .find(item=>item.id===group.id);
        if(process.env.WILD_ENGINE_CUT_PROBE==='1'){
          const regions=session.actorRegions(site,{worker:false,species:'rhino'});
          rhinoProbe={regions,standable:session.actorCanStand(site,
            {worker:false,species:'rhino'}),
            localClear:wasm.spatial_local_clear(site.x,site.z,site.x,site.z),
            gridWalkable:wasm.spatial_walkable(Math.round(site.x),Math.round(site.z)),
            weakRegion:wasm.lazy_weak_region(Math.round(site.x),Math.round(site.z)),
            enclosure:wasm.lazy_enclosure(Math.round(site.x),Math.round(site.z))};
        }
        return assessed;
      },true);
      validationMs=performance.now()-validateStart;
    }
    return {status:result<0?result===-1?'unknown':'invalid':'proposed',
      conservativeCut,cutEdges:result,flow,cells,edges,cutMs,convertMs,validationMs,
      boundarySegments:conservativeCut?boundaryCount:undefined,staticBoundary,
      workerRoutesBefore,workerRoutes,
      strokes:shape?.strokes.length,estimatedModules:shape?.slots.length,
      estimatedCost:shape?.estimatedCost,ambiguous:shape?.ambiguous.length,
      junctions:shape?.junctions.length,
      stitched:!!stitched&&!conservativeCut&&shape.strokes.length>1,
      strokeSummary:shape?.strokes.map(points=>({count:points.length,
        start:points[0],end:points.at(-1)})),
      modules:quote?.pieces.length,cost:quote?.cost,
      blockedPieces:quote?.blockedPieces.length,blockedCrops:quote?.blockedCrops.length,
      certification:certification?.protection,
      structural,
      rhinoProbe,
      profiles:certification?.profiles,
      strokePoints:shape?.strokes[0]?.length};
  };
  if(typeof wasm.lazy_local_crop_cut!=='function'){
    const start=performance.now(),plan=old();
    console.log(JSON.stringify({kind:'baseline',biome,site,ms:performance.now()-start,
      plan:{status:plan.status,modules:plan.modules?.length,cost:plan.cost},
      calls:instrumentation,sectorUpdates:wasm.lazy_sector_updates(),
      memoryBytes:wasm.memory.buffer.byteLength}));
  }else{
    const rows=[];
    for(const name of ['old','cut','cut','old']){
      const before={...instrumentation},updates=wasm.lazy_sector_updates();
      const start=performance.now(),result=name==='old'?old():cut();
      rows.push({name,ms:performance.now()-start,
        status:result.status,
        modules:Array.isArray(result.modules)?result.modules.length:result.modules,
        cost:result.cost,
        conservativeCut:result.conservativeCut,
        cutEdges:result.cutEdges,flow:result.flow,cells:result.cells,
        boundarySegments:result.boundarySegments,
        staticBoundary:result.staticBoundary,
        workerRoutes:result.workerRoutes,
        workerRoutesBefore:result.workerRoutesBefore,
        cutMs:result.cutMs,convertMs:result.convertMs,
        validationMs:result.validationMs,strokes:result.strokes,
        estimatedModules:result.estimatedModules,
        estimatedCost:result.estimatedCost,ambiguous:result.ambiguous,
        junctions:result.junctions,
        stitched:result.stitched,
        strokeSummary:result.strokeSummary,
        certification:result.certification,
        structural:result.structural,
        rhinoProbe:result.rhinoProbe,
        profiles:result.profiles,blockedPieces:result.blockedPieces,
        blockedCrops:result.blockedCrops,strokePoints:result.strokePoints,
        calls:Object.fromEntries(Object.keys(before).map(key=>
          [key,instrumentation[key]-before[key]])),
        sectorUpdates:wasm.lazy_sector_updates()-updates});
    }
    console.log(JSON.stringify({kind:'ABBA',biome,site,padding,connectorLimit,
      conservativeCut,rows,
      memoryBytes:wasm.memory.buffer.byteLength}));
  }
}finally{session.dispose();}
