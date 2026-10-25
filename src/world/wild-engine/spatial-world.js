import {spatialProps,spatialInstances,spatialChunkPayload} from './spatial-savanna-payload.js';
import {addSpatialBarriersBatch,applySpatialBarrierChanges} from './spatial-barrier-batch.js';
import {captureSpatialState,captureSpatialTerrainState,applySpatialState,validateSpatialState} from './spatial-state.js';
import {spatialWorldRoute,spatialWorldConnectivity,spatialWorldComponents,spatialWorldEnclosure} from './spatial-local-route.js';
import {BIOME_IDS,SPATIAL_BIOME_CODES} from '../biome-ids.js';
import {gatePortalPoints} from '../gate-passages.js';

// Synchronous world authority. The same WASM instance answers spatial queries
// and supplies visual buffers; rendering remains the caller's responsibility.
export function createSpatialWorld(module,{exports:runtimeExports}={}){
  const wasm=runtimeExports??new WebAssembly.Instance(module,{
    env:{emscripten_notify_memory_growth(){}},
    // Current Emscripten standalone builds may import this even though the
    // game never exits the spatial module. Older binaries omit the import.
    wasi_snapshot_preview1:{proc_exit(code){throw Error(`Wild Engine exited: ${code}`);}}
  }).exports;
  let chunk=null,navigationBuilt=false,chunks=[],generated=false,chunkRevision=0;
  let workerPortalRoutes=[];
  let diagnoseConnectivity=false;
  const connectivityReasons={connected:{},route:{}};
  const countReason=kind=>{
    if(!diagnoseConnectivity)return;
    const code=wasm.lazy_connected_reason();
    connectivityReasons[kind][code]=(connectivityReasons[kind][code]??0)+1;
  };
  const stageOverlayProps=ids=>{
    if(!Array.isArray(ids)||ids.length>128)throw TypeError('Invalid proposed prop removals');
    const records=ids.map(id=>{
      const match=/^spatial:([0-5]):(-?\d+):(-?\d+)$/.exec(id);
      if(!match)throw TypeError(`Invalid spatial prop ID: ${id}`);
      return match.slice(1).map(Number);
    });
    const pointer=wasm.spatial_overlay_prop_ptr(records.length);
    if(records.length&&!pointer)throw Error('Could not allocate prop overlay');
    if(records.length){
      const values=new Int32Array(wasm.memory.buffer,pointer,records.length*3);
      records.forEach((record,i)=>values.set(record,i*3));
    }
    return records.length;
  };
  const stageOverlayPolygons=polygons=>{
    if(!Array.isArray(polygons)||polygons.length>32||polygons.some(poly=>
      !Array.isArray(poly?.footprint)||poly.footprint.length<3||
      poly.footprint.length>64||poly.footprint.some(point=>
        !Number.isFinite(point?.x)||!Number.isFinite(point?.z))))
      throw TypeError('Invalid proposed polygon overlay');
    const pointer=wasm.spatial_overlay_polygon_ptr(polygons.length);
    if(polygons.length&&!pointer)throw Error('Could not allocate polygon overlay');
    if(polygons.length){
      const values=new Float32Array(wasm.memory.buffer,pointer,polygons.length*130);
      values.fill(0);
      polygons.forEach((polygon,i)=>{
        values[i*130]=polygon.footprint.length;
        values[i*130+1]=polygon.passMask??0;
        polygon.footprint.forEach((point,j)=>values.set([point.x,point.z],
          i*130+2+j*2));
      });
    }
    return polygons.length;
  };
  const heights=()=>new Float32Array(wasm.memory.buffer,wasm.spatial_heights_ptr(),49*49);
  const colors=()=>new Float32Array(wasm.memory.buffer,wasm.spatial_colors_ptr(),49*49*3);
  const water=()=>new Uint8Array(wasm.memory.buffer,wasm.spatial_water_ptr(),48*48);
  const groundMask=()=>new Uint8Array(wasm.memory.buffer,wasm.spatial_ground_mask_ptr(),35*35*4);
  const waterLevels=()=>new Float32Array(wasm.memory.buffer,wasm.spatial_water_levels_ptr(),48*48);
  const waterTriangles=()=>new Float32Array(wasm.memory.buffer,wasm.spatial_water_triangles_ptr(),wasm.spatial_water_vertex_count()*3);
  function changedChunks(){
    const count=wasm.spatial_changed_chunk_count();
    if(!count)return [];
    const pairs=new Int32Array(wasm.memory.buffer,wasm.spatial_changed_chunks_ptr(),count*2);
    return Array.from({length:count},(_,i)=>({cx:pairs[i*2],cz:pairs[i*2+1]}));
  }
  function generate(seed,cx,cz,biome='savanna',{canyonOpenRight=false}={}){
    const name=BIOME_IDS[biome]??biome;
    if(!Object.hasOwn(SPATIAL_BIOME_CODES,name))throw RangeError('Unsupported spatial biome');
    if(canyonOpenRight&&name!=='canyons')throw RangeError('One-wall variant requires canyons');
    const count=wasm.spatial_generate_biome(seed>>>0,canyonOpenRight?6:SPATIAL_BIOME_CODES[name],cx|0,cz|0);
    chunk={cx:cx|0,cz:cz|0,count};chunks=[[cx|0,cz|0]];navigationBuilt=false;generated=true;
    workerPortalRoutes=[];chunkRevision++;
    return chunk;
  }
  function addChunk(cx,cz){
    if(!generated)throw Error('Generate the world before adding a chunk');
    const result=wasm.spatial_add_chunk(cx|0,cz|0);
    if(result>0){chunk={cx:cx|0,cz:cz|0,count:result-1};chunks.push([cx|0,cz|0]);chunkRevision++;}
    return result>0?result-1:result;
  }
  // Publication already selected the prepared buffers; never call selectChunk
  // here, because the synchronous selection path regenerates visual data.
  function publishPreparedChunk(id,cx,cz){
    const result=wasm.spatial_prepare_publish(id);
    if(result>0){chunk={cx:cx|0,cz:cz|0,count:result-1};chunks.push([cx|0,cz|0]);chunkRevision++;}
    return result;
  }
  const preparation=wasm.spatial_prepare_start?{
    start:(cx,cz)=>wasm.spatial_prepare_start(cx|0,cz|0),
    status:()=>wasm.spatial_prepare_status(),
    cancel:()=>wasm.spatial_prepare_cancel(),
    release:()=>wasm.spatial_prepare_release(),
    shutdown:()=>wasm.spatial_prepare_shutdown(),
    publish:publishPreparedChunk,
    metric:field=>wasm.spatial_prepare_metric(field),
    visualOptions:flags=>wasm.spatial_prepare_visual_options?.(flags),
    waterShore:()=>{const size=wasm.spatial_prepare_buffer_bytes(9);return size?new Float32Array(wasm.memory.buffer,wasm.spatial_prepare_buffer_ptr(9),size/4).slice():null;},
    waterBed:()=>{
      const size=wasm.spatial_prepare_buffer_bytes(7);if(!size)return null;
      const values=new Float64Array(wasm.memory.buffer,wasm.spatial_prepare_buffer_ptr(8),8);
      const [nx,nz,minX,minZ,width,height,lo,span]=values;
      if(size!==nx*nz*4)throw Error('Invalid prepared water map');
      return {nx,nz,minX,minZ,width,height,lo,span,bytes:new Uint8Array(wasm.memory.buffer,wasm.spatial_prepare_buffer_ptr(7),size).slice()};
    }
  }:null;
  function selectChunk(cx,cz){
    if(!generated)throw Error('Generate the world before selecting a chunk');
    const result=wasm.spatial_select_chunk(cx|0,cz|0);
    if(result>0)chunk={cx:cx|0,cz:cz|0,count:result-1};
    // C returns 0 for an absent chunk and count+1 for a resident chunk.
    // Preserve the distinction when a resident chunk has zero props.
    return result>0?result-1:-1;
  }
  function removeChunk(cx,cz){
    const removed=wasm.spatial_remove_chunk(cx|0,cz|0);
    if(removed){
      chunkRevision++;
      chunks=chunks.filter(([x,z])=>x!==(cx|0)||z!==(cz|0));
      if(chunk?.cx===(cx|0)&&chunk?.cz===(cz|0)){
        const last=chunks.at(-1);
        chunk=last?{cx:last[0],cz:last[1],count:wasm.spatial_prop_count()}:null;
      }
    }
    return removed;
  }
  function removeChunks(coordinates){
    if(!Array.isArray(coordinates)||coordinates.length>4096||coordinates.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isInteger(n)||n<-2147483648||n>2147483647)))throw TypeError('Invalid chunk removal batch');
    if(!coordinates.length)return 0;
    if(!wasm.spatial_remove_chunks)return coordinates.reduce((count,[x,z])=>count+removeChunk(x,z),0);
    const pointer=wasm.spatial_remove_chunks_ptr(coordinates.length);
    if(!pointer)throw Error('Could not allocate chunk removal batch');
    const data=new Int32Array(wasm.memory.buffer,pointer,coordinates.length*2);
    coordinates.forEach((p,i)=>data.set(p,i*2));
    const removed=wasm.spatial_remove_chunks(coordinates.length);
    if(removed<0)throw Error('Native chunk removal failed');
    if(removed){
      const keys=new Set(coordinates.map(([x,z])=>x+','+z));
      chunkRevision+=removed;chunks=chunks.filter(([x,z])=>!keys.has(x+','+z));
      if(chunk&&keys.has(chunk.cx+','+chunk.cz)){
        const last=chunks.at(-1);chunk=last?{cx:last[0],cz:last[1],count:wasm.spatial_prop_count()}:null;
      }
    }
    return removed;
  }
  function props(){
    return spatialProps(wasm);
  }
  function instances(){
    if(!chunk)throw Error('Generate a chunk before reading prop instances');
    return spatialInstances(wasm,chunk.cx,chunk.cz);
  }
  function chunkPayload(){
    if(!chunk)throw Error('Generate a chunk before reading its render payload');
    return spatialChunkPayload(wasm,chunk.cx,chunk.cz);
  }
  function route(start,end){
    if(![start?.x,start?.z,end?.x,end?.z].every(Number.isSafeInteger))
      throw RangeError('Grid routes require integer coordinates; use routeWorld for actor positions');
    if(!navigationBuilt)return {status:'unknown',points:[]};
    const count=wasm.lazy_route(start.x,start.z,end.x,end.z);
    countReason('route');
    if(count<0)return {status:'unknown',points:[]};
    if(!count)return {status:'blocked',points:[]};
    const pairs=new Int32Array(wasm.memory.buffer,wasm.lazy_route_ptr(),count*2),points=[];
    for(let i=0;i<count;i++){
      if(pairs[i*2]===-2147483648){
        const crossing=workerPortalRoutes[pairs[i*2+1]];
        if(!crossing)return {status:'unknown',points:[]};
        points.push(...crossing);
      }else points.push({x:pairs[i*2],z:pairs[i*2+1]});
    }
    return {status:'found',points};
  }
  // Experimental native whole-world planner. Production continues through
  // routeWorld until differential and sustained campaign QA are complete.
  function routeWorldNative(start,end,{cached=false}={}){
    if(![start?.x,start?.z,end?.x,end?.z].every(Number.isFinite))
      throw RangeError('World routes require finite coordinates');
    if(!navigationBuilt||typeof wasm.spatial_world_route!=='function')
      return {status:'unknown',points:[]};
    const count=cached?wasm.spatial_world_route_cached(start.x,start.z,end.x,end.z):
      wasm.spatial_world_route(start.x,start.z,end.x,end.z);
    countReason('route');
    if(count<0){
      const reason={1:'start-connector',2:'end-connector',3:'native-graph',
        4:'invalid-coordinate'}[wasm.spatial_world_route_reason()]??'native-graph';
      return {status:'unknown',points:[],reason};
    }
    if(!count)return {status:'blocked',points:[]};
    const values=new Float32Array(wasm.memory.buffer,wasm.spatial_world_route_ptr(),count*2);
    const points=Array.from({length:count},(_,i)=>({x:values[i*2],z:values[i*2+1]}));
    // Preserve the caller's exact endpoint. The native physical search uses
    // float32, while actor state and the current planner retain JS doubles.
    if(Math.hypot(points.at(-1).x-end.x,points.at(-1).z-end.z)<1e-4)
      points[points.length-1]={x:end.x,z:end.z};
    return {status:'found',points};
  }
  function routeWorldNativeBatch(queries){
    if(!Array.isArray(queries)||queries.length>4096||queries.some(q=>
      ![q.start?.x,q.start?.z,q.end?.x,q.end?.z].every(Number.isFinite)))
      throw RangeError('Expected at most 4096 finite world route queries');
    if(!navigationBuilt)return queries.map(()=>({status:'unknown',points:[]}));
    const pointer=wasm.spatial_route_batch_input_ptr(queries.length);
    if(!pointer&&queries.length)throw Error('Could not allocate native route batch');
    const input=new Float32Array(wasm.memory.buffer,pointer,queries.length*4);
    for(let i=0;i<queries.length;i++){
      const {start,end}=queries[i];
      input[i*4]=start.x;input[i*4+1]=start.z;
      input[i*4+2]=end.x;input[i*4+3]=end.z;
    }
    if(wasm.spatial_world_route_batch(queries.length)!==queries.length)
      throw Error('Native route batch failed');
    const rows=new Int32Array(wasm.memory.buffer,wasm.spatial_route_batch_rows_ptr(),queries.length*4);
    const points=new Float32Array(wasm.memory.buffer,wasm.spatial_route_batch_points_ptr(),
      wasm.spatial_route_batch_point_count()*2);
    return queries.map((_,i)=>{
      const count=rows[i*4];
      if(count<0)return {status:'unknown',points:[],
        reason:{1:'start-connector',2:'end-connector',3:'native-graph',
          4:'invalid-coordinate'}[rows[i*4+2]]??'native-graph'};
      if(!count)return {status:'blocked',points:[]};
      const offset=rows[i*4+1]*2;
      const route=Array.from({length:count},(_,j)=>({
        x:points[offset+j*2],z:points[offset+j*2+1]}));
      if(Math.hypot(route.at(-1).x-queries[i].end.x,
        route.at(-1).z-queries[i].end.z)<1e-4)
        route[route.length-1]={x:queries[i].end.x,z:queries[i].end.z};
      return {status:'found',points:route};
    });
  }
  function connected(start,end){
    if(![start?.x,start?.z,end?.x,end?.z].every(Number.isSafeInteger))
      throw RangeError('Grid connectivity requires integer coordinates');
    if(!navigationBuilt)return 'unknown';
    const result=wasm.lazy_connected(start.x,start.z,end.x,end.z);
    countReason('connected');
    return result<0?'unknown':result?'possible':'blocked';
  }
  function componentAt(point){
    if(![point?.x,point?.z].every(Number.isSafeInteger))
      throw RangeError('Grid component lookup requires integer coordinates');
    if(!navigationBuilt)return null;
    const result=wasm.lazy_component(point.x,point.z);
    return result===-1?null:result;
  }
  function componentsWorldBatch(points){
    if(!Array.isArray(points)||!points.every(point=>
      Number.isFinite(point?.x)&&Number.isFinite(point?.z)&&
      Math.abs(point.x)<2147483000&&Math.abs(point.z)<2147483000))
      throw RangeError('Region batch needs finite world coordinates');
    if(!navigationBuilt)return points.map(()=>({ids:[],unknown:true}));
    const result=[];
    for(let offset=0;offset<points.length;offset+=4096){
      const count=Math.min(4096,points.length-offset);
      const pointer=wasm.spatial_region_batch_input_ptr(count);
      if(!pointer)throw Error('Could not allocate native region batch');
      const input=new Float32Array(wasm.memory.buffer,pointer,count*2);
      for(let i=0;i<count;i++){
        input[i*2]=points[offset+i].x;
        input[i*2+1]=points[offset+i].z;
      }
      if(wasm.spatial_region_batch(count)!==count)throw Error('Native region batch failed');
      const rows=new Int32Array(wasm.memory.buffer,wasm.spatial_region_batch_output_ptr(),count*5);
      for(let i=0;i<count;i++){
        const ids=[];
        for(let slot=1;slot<=4;slot++)if(rows[i*5+slot]>=0)ids.push(rows[i*5+slot]);
        result.push({ids,unknown:rows[i*5]!==0});
      }
    }
    return result;
  }
  const surface=(x,z)=>wasm.spatial_surface(x,z);
  const slope=(x,z)=>Math.hypot(surface(x+.8,z)-surface(x-.8,z),
    surface(x,z+.8)-surface(x,z-.8))/1.6;
  function setWorkerGatePortals(gates){
    wasm.lazy_clear_portals();
    workerPortalRoutes=[];
    const clear=(a,b)=>{
      const length=Math.hypot(a.x-b.x,a.z-b.z),steps=Math.max(1,Math.ceil(length/1.25));
      for(let i=0;i<steps;i++){
        const p={x:a.x+(b.x-a.x)*i/steps,z:a.z+(b.z-a.z)*i/steps};
        const q={x:a.x+(b.x-a.x)*(i+1)/steps,z:a.z+(b.z-a.z)*(i+1)/steps};
        if(!wasm.spatial_local_clear(p.x,p.z,q.x,q.z))return false;
      }
      return true;
    };
    const connector=point=>{
      const candidates=[];
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
        const cell={x:Math.round(point.x)+dx,z:Math.round(point.z)+dz};
        if(wasm.spatial_walkable(cell.x,cell.z)&&clear(point,cell))
          candidates.push({cell,distance:Math.hypot(cell.x-point.x,cell.z-point.z)});
      }
      candidates.sort((a,b)=>a.distance-b.distance||a.cell.x-b.cell.x||a.cell.z-b.cell.z);
      return candidates[0]?.cell;
    };
    for(const gate of gates){
      if(!gate.gate||gate.status==='ruined')continue;
      const pair=gatePortalPoints(gate,.28);
      if(pair.length!==2)continue;
      let id;
      if(typeof wasm.spatial_add_gate_portal==='function'){
        id=wasm.spatial_add_gate_portal(pair[0].x,pair[0].z,pair[1].x,pair[1].z);
      }else{
        if(!clear(pair[0],pair[1])||!clear(pair[1],pair[0]))continue;
        const from=connector(pair[0]),to=connector(pair[1]);
        if(!from||!to)continue;
        id=typeof wasm.lazy_add_portal_world==='function'?
          wasm.lazy_add_portal_world(from.x,from.z,to.x,to.z,
            pair[0].x,pair[0].z,pair[1].x,pair[1].z):
          wasm.lazy_add_portal(from.x,from.z,to.x,to.z);
      }
      if(id<0)continue;
      workerPortalRoutes[id*2]=pair;
      workerPortalRoutes[id*2+1]=[pair[1],pair[0]];
    }
    wasm.lazy_commit_portals();
  }
  return {wasm,preparation,generate,addChunk,selectChunk,removeChunk,removeChunks,currentChunk:()=>chunk,
    enableConnectivityDiagnostics:()=>{diagnoseConnectivity=true;},
    connectivityDiagnostics:()=>structuredClone(connectivityReasons),
    enclosureAt:point=>navigationBuilt?wasm.lazy_enclosure(point.x,point.z):-1,
    heights,colors,water,groundMask,waterLevels,waterTriangles,props,instances,chunkPayload,changedChunks,route,connected,componentAt,
    routeWorld:(start,end)=>navigationBuilt?spatialWorldRoute(wasm,route,start,end):{status:'unknown',points:[]},
    routeWorldNative,
    routeWorldNativeBatch,
    chunkRevision:()=>chunkRevision,
    connectedWorld:(start,end)=>navigationBuilt?spatialWorldConnectivity(wasm,connected,start,end):'unknown',
    componentsWorld:point=>navigationBuilt?spatialWorldComponents(wasm,componentAt,point):{ids:[],unknown:true},
    enclosureWorld:point=>navigationBuilt?spatialWorldEnclosure(wasm,point):{ids:[],status:'unknown'},
    componentsWorldBatch,setWorkerGatePortals,
    localClear:(start,end)=>Boolean(wasm.spatial_local_clear(start.x,start.z,end.x,end.z)),
    overlayStaticClearance:(point,limit,removeIds=[],barriers=[],propIds=[])=>{
      if(!Array.isArray(removeIds)||removeIds.length>4||
        !Array.isArray(barriers)||barriers.length>128)
        throw TypeError('Invalid static-clearance overlay');
      const additions=barriers.length?wasm.spatial_barrier_batch_ptr(barriers.length):0;
      const removals=removeIds.length?wasm.spatial_barrier_removal_ptr(removeIds.length):0;
      if(barriers.length&&!additions||removeIds.length&&!removals)
        throw Error('Could not stage static-clearance overlay');
      if(additions){
        const values=new Float32Array(wasm.memory.buffer,additions,barriers.length*6);
        barriers.forEach((barrier,i)=>values.set([barrier.x,barrier.z,
          barrier.halfX,barrier.halfZ,barrier.yaw??0,barrier.passMask??0],i*6));
      }
      if(removals)new Int32Array(wasm.memory.buffer,removals,removeIds.length)
        .set(removeIds);
      const propCount=stageOverlayProps(propIds);
      return wasm.spatial_overlay_static_object_clearance(point.x,point.z,limit,
        removeIds.length,barriers.length,propCount);
    },
    overlayCutSolidFaces:(boundary,radius,removeIds=[],barriers=[],propIds=[])=>{
      if(!Array.isArray(boundary)||boundary.length<4||boundary.length%4||
        boundary.length>4096*4||!Number.isFinite(radius)||radius<=0||
        !Array.isArray(removeIds)||removeIds.length>4||
        !Array.isArray(barriers)||barriers.length>128)
        throw TypeError('Invalid read-only cut-face proof');
      const additions=barriers.length?wasm.spatial_barrier_batch_ptr(barriers.length):0;
      const removals=removeIds.length?wasm.spatial_barrier_removal_ptr(removeIds.length):0;
      const faces=wasm.spatial_overlay_cut_face_ptr(boundary.length/4);
      if(!faces||barriers.length&&!additions||removeIds.length&&!removals)
        throw Error('Could not stage read-only cut-face proof');
      if(additions){
        const values=new Float32Array(wasm.memory.buffer,additions,barriers.length*6);
        barriers.forEach((barrier,i)=>values.set([barrier.x,barrier.z,
          barrier.halfX,barrier.halfZ,barrier.yaw??0,barrier.passMask??0],i*6));
      }
      if(removals)new Int32Array(wasm.memory.buffer,removals,removeIds.length)
        .set(removeIds);
      const propCount=stageOverlayProps(propIds);
      new Int32Array(wasm.memory.buffer,faces,boundary.length).set(boundary);
      const count=wasm.spatial_overlay_cut_solid_faces(boundary.length/4,
        removeIds.length,barriers.length,propCount,radius);
      if(count<0)return null;
      return [...new Uint8Array(wasm.memory.buffer,
        wasm.spatial_overlay_cut_result_ptr(),count)].map(Boolean);
    },
    overlayLocalClear:(start,end,removeIds,barriers,propIds=[],polygons=[])=>{
      if(!Array.isArray(removeIds)||removeIds.length>4||
        removeIds.some(id=>!Number.isSafeInteger(id)||id<=0)||
        !Array.isArray(barriers)||barriers.length>128)
        throw TypeError('Expected at most four removed and 128 proposed barriers');
      const additions=barriers.length?wasm.spatial_barrier_batch_ptr(barriers.length):0;
      const removals=removeIds.length?wasm.spatial_barrier_removal_ptr(removeIds.length):0;
      if(barriers.length&&!additions||removeIds.length&&!removals)
        throw Error('Could not allocate read-only barrier overlay');
      if(additions){
        const values=new Float32Array(wasm.memory.buffer,additions,barriers.length*6);
        barriers.forEach((barrier,i)=>values.set([barrier.x,barrier.z,barrier.halfX,
          barrier.halfZ,barrier.yaw??0,barrier.passMask??0],i*6));
      }
      if(removals)new Int32Array(wasm.memory.buffer,removals,removeIds.length)
        .set(removeIds);
      const propCount=stageOverlayProps(propIds);
      const polygonCount=stageOverlayPolygons(polygons);
      const result=wasm.spatial_overlay_local_clear(start.x,start.z,end.x,end.z,
        removeIds.length,barriers.length,propCount,polygonCount);
      return result<0?null:Boolean(result);
    },
    overlayReachBatch:(origin,targets,removeIds,barriers,
      {reverse=false,margin=16,portals=[],propIds=[],polygons=[],withCost=false}={})=>{
      if(!Array.isArray(targets)||targets.length<1||targets.length>256||
        !Array.isArray(removeIds)||removeIds.length>4||
        removeIds.some(id=>!Number.isSafeInteger(id)||id<=0)||
        !Array.isArray(barriers)||barriers.length>128||
        !Array.isArray(portals)||portals.length>128)
        throw TypeError('Invalid read-only reachability batch');
      const additions=barriers.length?wasm.spatial_barrier_batch_ptr(barriers.length):0;
      const removals=removeIds.length?wasm.spatial_barrier_removal_ptr(removeIds.length):0;
      const input=wasm.spatial_overlay_reach_input_ptr(targets.length);
      const portalInput=wasm.spatial_overlay_reach_portal_ptr(portals.length);
      if(!input||portals.length&&!portalInput||
        barriers.length&&!additions||removeIds.length&&!removals)
        throw Error('Could not allocate read-only reachability batch');
      if(additions){
        const values=new Float32Array(wasm.memory.buffer,additions,barriers.length*6);
        barriers.forEach((barrier,i)=>values.set([barrier.x,barrier.z,barrier.halfX,
          barrier.halfZ,barrier.yaw??0,barrier.passMask??0],i*6));
      }
      if(removals)new Int32Array(wasm.memory.buffer,removals,removeIds.length).set(removeIds);
      const propCount=stageOverlayProps(propIds);
      const polygonCount=stageOverlayPolygons(polygons);
      const inputValues=new Float32Array(wasm.memory.buffer,input,targets.length*2);
      targets.forEach((target,i)=>inputValues.set([target.x,target.z],i*2));
      if(portals.length){
        const portalValues=new Float32Array(wasm.memory.buffer,portalInput,portals.length*4);
        portals.forEach(([a,b],i)=>portalValues.set([a.x,a.z,b.x,b.z],i*4));
      }
      const found=wasm.spatial_overlay_reach_batch(origin.x,origin.z,targets.length,
        removeIds.length,barriers.length,propCount,portals.length,reverse?1:0,
        margin,polygonCount,withCost?1:0);
      if(found<0)return null;
      const output=wasm.spatial_overlay_reach_result_ptr();
      const statuses=[...new Int32Array(wasm.memory.buffer,output,targets.length)]
        .map(value=>value===1?'found':'unknown');
      if(!withCost)return statuses;
      const costs=wasm.spatial_overlay_reach_cost_ptr();
      const values=[...new Float32Array(wasm.memory.buffer,costs,targets.length)];
      return statuses.map((status,i)=>({status,
        cost:status==='found'?values[i]:null}));
    },
    localClearExcept:(start,end,ids)=>{
      if(!Array.isArray(ids)||ids.length<1||ids.length>4||
        ids.some(id=>!Number.isSafeInteger(id)||id<=0))
        throw TypeError('Expected 1–4 native barrier IDs');
      return Boolean(wasm.spatial_local_clear_except(start.x,start.z,end.x,end.z,
        ...Array.from({length:4},(_,i)=>ids[i]??0)));
    },
    setSettlement:(x,z,hx,hz)=>{
      if(!generated)throw Error('Generate the world before placing a settlement');
      return wasm.spatial_set_settlement(x,z,hx,hz);
    },
    addSettlement:(x,z,hx,hz)=>{
      if(!generated)throw Error('Generate the world before placing a settlement');
      return wasm.spatial_add_settlement(x,z,hx,hz);
    },
    buildNavigation:(radius,worker)=>{
      if(!chunk)throw Error('Generate a chunk before building its navigation');
      const loaded=wasm.spatial_build_nav(radius,worker?1:0);
      navigationBuilt=loaded>0;return loaded;
    },
    buildNavigationProfile:(index,radius,worker=false)=>{
      if(!chunk)throw Error('Generate a chunk before building its navigation');
      const loaded=wasm.spatial_build_nav_profile(index,radius,worker?1:0);
      navigationBuilt=loaded>0;return loaded;
    },
    selectNavigation:worker=>{
      const loaded=wasm.spatial_select_nav_profile(worker?1:0);
      navigationBuilt=loaded>0;return loaded;
    },
    selectNavigationProfile:index=>{
      const loaded=wasm.spatial_select_nav_profile_index(index);
      navigationBuilt=loaded>0;return loaded;
    },
    addWall:(x,z,halfX,halfZ)=>wasm.spatial_add_wall(x,z,halfX,halfZ),
    removeWall:id=>wasm.spatial_remove_wall(id),
    addBarrier:(x,z,halfX,halfZ,passMask=0)=>wasm.spatial_add_barrier(x,z,halfX,halfZ,passMask),
    addOrientedBarrier:(x,z,halfX,halfZ,yaw,passMask=0)=>
      wasm.spatial_add_oriented_barrier(x,z,halfX,halfZ,yaw,passMask),
    removeProp:({group,gx,gz})=>wasm.spatial_remove_prop(group,gx,gz),
    restoreRemovedProps:records=>{
      if(!Array.isArray(records)||records.length>100000||
         !records.every(p=>Number.isSafeInteger(p.group)&&p.group>=0&&p.group<=5&&
           Number.isInteger(p.gx)&&p.gx>=-2147483648&&p.gx<=2147483647&&
           Number.isInteger(p.gz)&&p.gz>=-2147483648&&p.gz<=2147483647))
        throw TypeError('Expected valid removed spatial prop records');
      const pointer=wasm.spatial_removed_prop_restore_ptr(records.length);
      if(records.length&&!pointer)throw Error('Could not allocate removed spatial props');
      if(records.length){
        const view=new Int32Array(wasm.memory.buffer,pointer,records.length*3);
        records.forEach((p,i)=>{view[i*3]=p.group;view[i*3+1]=p.gx;view[i*3+2]=p.gz;});
      }
      if(wasm.spatial_restore_removed_props(records.length)!==1)
        throw Error('Could not restore removed spatial props');
    },
    addBarriersBatch:barriers=>addSpatialBarriersBatch(wasm,barriers),
    applyBarrierChanges:(removeIds,barriers)=>applySpatialBarrierChanges(wasm,removeIds,barriers),
    snapshot:()=>{
      if(!generated)throw Error('Generate the world before capturing spatial state');
      return captureSpatialState(wasm);
    },
    terrainState:()=>{
      if(!generated)throw Error('Generate the world before capturing terrain state');
      return captureSpatialTerrainState(wasm);
    },
    restoreState:(state,cx=0,cz=0)=>{
      validateSpatialState(state);
      generate(state.seed,cx,cz,state.biome??'savanna');
      applySpatialState(wasm,state);
      return chunk;
    },
    removeBarrier:id=>wasm.spatial_remove_barrier(id),
    addPolygon:(points,passMask=0)=>{
      if(!Array.isArray(points)||points.length<3||points.length>64||
         !points.every(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.z)))
        throw TypeError('Expected a finite 3–64 vertex spatial polygon');
      const pointer=wasm.spatial_polygon_input_ptr(points.length);
      if(!pointer)throw Error('Could not allocate spatial polygon');
      const input=new Float32Array(wasm.memory.buffer,pointer,points.length*2);
      points.forEach((point,i)=>{input[i*2]=point.x;input[i*2+1]=point.z;});
      const id=wasm.spatial_add_polygon(points.length,passMask);
      if(!id)throw Error('Invalid spatial polygon');
      return id;
    },
    removePolygon:id=>wasm.spatial_remove_polygon(id),
    setBarrierPassability:(id,passMask)=>wasm.spatial_set_barrier_passability(id,passMask),
    walkable:(x,z)=>Boolean(wasm.spatial_walkable(x,z)),
    edge:(x,z,nx,nz)=>Boolean(wasm.spatial_edge(x,z,nx,nz)),
    propBlocked:(x,z)=>Boolean(wasm.spatial_prop_blocked(x,z)),
    surface,slope,
    surfaceAnywhere:(x,z)=>wasm.spatial_surface_anywhere(x,z),
    // Borrowed view, valid until the next grid query or WASM memory growth.
    surfaceGrid:(minX,minZ,width,height,nx,nz)=>{
      if(![minX,minZ,width,height].every(Number.isFinite)||!Number.isInteger(nx)||!Number.isInteger(nz)||nx<2||nz<2||nx>513||nz>513)return null;
      const pointer=wasm.spatial_surface_grid?.(minX,minZ,width,height,nx,nz);
      return pointer?new Float32Array(wasm.memory.buffer,pointer,nx*nz):null;
    },
    fluidLevel:(x,z)=>wasm.spatial_fluid_level(x,z),
    fluidLevelAnywhere:(x,z)=>wasm.spatial_fluid_level_anywhere(x,z),
    waterShoreAnywhere:(x,z)=>wasm.spatial_water_shore_anywhere(x,z),
    riverCenter:z=>wasm.spatial_river_center(z),
    riverEdge:(z,direction)=>wasm.spatial_river_edge(z,direction),
    riverLevel:()=>wasm.spatial_river_level(),
    fluidSurfaceLevel:()=>wasm.spatial_fluid_surface_level(),
    wetlandMaskAnywhere:(x,z)=>wasm.spatial_wetland_mask_anywhere(x,z),
    groundColorsAnywhere:points=>{
      if(!(points instanceof Float32Array)||points.length===0||points.length%2||points.length>100000)
        throw TypeError('Expected 1–50,000 native ground-color coordinate pairs');
      const count=points.length/2,pointer=wasm.spatial_ground_color_input_ptr(count);
      if(!pointer)throw Error('Could not allocate ground-color query');
      new Float32Array(wasm.memory.buffer,pointer,points.length).set(points);
      if(wasm.spatial_ground_color_batch(count)!==count)
        throw RangeError('Invalid native ground-color coordinates');
      return new Float32Array(wasm.memory.buffer,wasm.spatial_ground_color_result_ptr(),count*3).slice();
    },
    horizon:(region,waterColor=[0,0,0],river=true)=>{
      if(!generated||![region?.cx,region?.cz,...(region?.bounds??[])].every(Number.isSafeInteger)||
         region.bounds.length!==4||!Array.isArray(waterColor)||waterColor.length!==3||
         !waterColor.every(v=>Number.isFinite(v)&&v>=0&&v<=1))
        throw TypeError('Expected a generated canyon or desert, integer region bounds and RGB water color');
      const count=wasm.spatial_build_horizon(region.cx,region.cz,...region.bounds,
        river?1:0,...waterColor);
      if(!count)throw Error('Native horizon could not be built');
      const terrain=new Float32Array(wasm.memory.buffer,wasm.spatial_horizon_terrain_ptr(),count*9).slice();
      const waterCount=wasm.spatial_horizon_water_count();
      const water=new Float32Array(wasm.memory.buffer,wasm.spatial_horizon_water_ptr(),waterCount*9).slice();
      return {terrain,water};
    },
    metrics:()=>({memoryBytes:wasm.memory.buffer.byteLength,loadedChunks:wasm.spatial_chunk_count(),
      residentPropRecords:wasm.spatial_resident_prop_count?.()??null,
      residentVisiblePropRecords:wasm.spatial_resident_visible_prop_count?.()??null,
      loadedSectors:wasm.lazy_loaded_sectors(),
      sectorSlots:wasm.spatial_sector_slots(),
      sectorUpdates:wasm.lazy_sector_updates(),haloProps:wasm.spatial_halo_prop_count()})};
}
