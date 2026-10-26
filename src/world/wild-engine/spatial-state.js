// The far horizon depends on relief and settlement flattening, not walls,
// shields or removed props. Read only that small spatial subset for workers.
function spatialSettlements(wasm){
  const settlements=[];
  const siteCount=wasm.spatial_settlement_state_count();
  const sitePointer=wasm.spatial_settlement_state_ptr();
  const sites=new DataView(wasm.memory.buffer,sitePointer,siteCount*16);
  for(let i=0;i<siteCount;i++){
    const at=i*16;
    settlements.push({x:sites.getFloat32(at,true),z:sites.getFloat32(at+4,true),
      hx:sites.getFloat32(at+8,true),hz:sites.getFloat32(at+12,true)});
  }
  return settlements;
}
const spatialBiome=wasm=>wasm.spatial_world_biome()===1?'desert':
  wasm.spatial_world_biome()===2?'grand_river':wasm.spatial_world_biome()===3?'volcanoes':
  [4,7].includes(wasm.spatial_world_biome())?'mangrove':wasm.spatial_world_biome()===5?'canyons':'savanna';
const spatialVariant=wasm=>wasm.spatial_world_biome()===7?{mangroveChannels:true}:{};

export function captureSpatialTerrainState(wasm){
  return {version:1,seed:wasm.spatial_world_seed()>>>0,biome:spatialBiome(wasm),...spatialVariant(wasm),
    settlements:spatialSettlements(wasm)};
}

export function validateSpatialTerrainState(state){
  if(state?.version!==1||(state.mangroveChannels!==undefined&&(typeof state.mangroveChannels!=='boolean'||state.biome!=='mangrove'))||!Number.isInteger(state.seed)||state.seed<0||state.seed>0xffffffff||
     !['savanna','desert','grand_river','volcanoes','mangrove','canyons'].includes(state.biome)||
     !Array.isArray(state.settlements)||state.settlements.length>100000)
    throw TypeError('Invalid spatial terrain state');
  for(const site of state.settlements)if(![site?.x,site?.z,site?.hx,site?.hz].every(
       value=>Number.isFinite(value)&&Number.isFinite(Math.fround(value)))||
     site.hx<=0||site.hz<=0||site.hx>100||site.hz>100)
    throw TypeError('Invalid spatial terrain settlement');
  return state;
}

// Compact, versioned QA snapshot of the C++ spatial authority. Residency and
// route trees are derived data; only the seed and authorized topology persist.
export function captureSpatialState(wasm){
  const settlements=spatialSettlements(wasm);
  const barriers=[];
  const barrierCount=wasm.spatial_barrier_state_count();
  const barrierPointer=wasm.spatial_barrier_state_ptr();
  const records=new DataView(wasm.memory.buffer,barrierPointer,barrierCount*28);
  for(let i=0;i<barrierCount;i++){
    const at=i*28;
    barriers.push({id:records.getInt32(at,true),x:records.getFloat32(at+4,true),
      z:records.getFloat32(at+8,true),halfX:records.getFloat32(at+12,true),
      halfZ:records.getFloat32(at+16,true),yaw:records.getFloat32(at+20,true),
      passMask:records.getInt32(at+24,true)});
  }
  const polygons=[];
  const polygonCount=wasm.spatial_polygon_state_count();
  const polygonPointer=wasm.spatial_polygon_state_ptr();
  const polygonRecords=new DataView(wasm.memory.buffer,polygonPointer,polygonCount*528);
  for(let i=0;i<polygonCount;i++){
    const at=i*528,count=polygonRecords.getInt32(at+4,true),points=[];
    for(let j=0;j<count;j++)points.push({x:polygonRecords.getFloat32(at+16+j*8,true),
      z:polygonRecords.getFloat32(at+20+j*8,true)});
    polygons.push({id:polygonRecords.getInt32(at,true),
      passMask:polygonRecords.getInt32(at+8,true),points});
  }
  const removedProps=[],removedCount=wasm.spatial_removed_prop_count();
  const removed=new Int32Array(wasm.memory.buffer,wasm.spatial_removed_prop_state_ptr(),removedCount*3);
  for(let i=0;i<removedCount;i++)removedProps.push({group:removed[i*3],gx:removed[i*3+1],gz:removed[i*3+2]});
  return {version:5,biome:spatialBiome(wasm),...spatialVariant(wasm),
    seed:wasm.spatial_world_seed()>>>0,settlements,barriers,polygons,removedProps,
    nextBarrierId:wasm.spatial_next_barrier_id(),nextPolygonId:wasm.spatial_next_polygon_id()};
}

export function validateSpatialState(state){
  const finiteF32=value=>Number.isFinite(value)&&Number.isFinite(Math.fround(value));
  if(state?.mangroveChannels!==undefined&&(typeof state.mangroveChannels!=='boolean'||state.biome!=='mangrove'))throw TypeError('Invalid mangrove variant');
  if((state?.version!==1&&state?.version!==2&&state?.version!==3&&state?.version!==4&&state?.version!==5)||
     (state.version>=2&&!['savanna','desert','grand_river','volcanoes','mangrove','canyons'].includes(state.biome))||
     !Number.isInteger(state.seed)||state.seed<0||state.seed>0xffffffff||
     !Array.isArray(state.settlements)||!Array.isArray(state.barriers)||
     (state.version>=3&&(!Array.isArray(state.removedProps)||state.removedProps.length>100000))||
     state.settlements.length>100000||state.barriers.length>100000||
     (state.version>=5&&(!Array.isArray(state.polygons)||state.polygons.length>100000||
       !Number.isInteger(state.nextPolygonId)||state.nextPolygonId<1||state.nextPolygonId>0x7fffffff))||
     !Number.isInteger(state.nextBarrierId)||
     state.nextBarrierId<1||state.nextBarrierId>0x7fffffff)
    throw TypeError('Invalid spatial state version or header');
  for(const site of state.settlements)if(!finiteF32(site.x)||!finiteF32(site.z)||
    !finiteF32(site.hx)||!finiteF32(site.hz)||site.hx<=0||site.hz<=0||
    site.hx>100||site.hz>100)throw TypeError('Invalid spatial settlement');
  let previous=0;
  for(const barrier of state.barriers){
    if(!Number.isInteger(barrier.id)||barrier.id<=previous||barrier.id>=state.nextBarrierId||
      !finiteF32(barrier.x)||!finiteF32(barrier.z)||
      !finiteF32(barrier.halfX)||!finiteF32(barrier.halfZ)||
      (state.version>=4&&!finiteF32(barrier.yaw))||
      barrier.halfX<=0||barrier.halfZ<=0||barrier.halfX>100||barrier.halfZ>100||
      !Number.isInteger(barrier.passMask)||barrier.passMask<0||barrier.passMask>3)
      throw TypeError('Invalid spatial barrier');
    previous=barrier.id;
  }
  previous=0;
  for(const polygon of state.polygons??[]){
    if(!Number.isInteger(polygon.id)||polygon.id<=previous||polygon.id>=state.nextPolygonId||
       !Number.isInteger(polygon.passMask)||polygon.passMask<0||polygon.passMask>3||
       !Array.isArray(polygon.points)||polygon.points.length<3||polygon.points.length>64||
       polygon.points.some(p=>!finiteF32(p?.x)||!finiteF32(p?.z)))
      throw TypeError('Invalid spatial polygon');
    const xs=polygon.points.map(p=>p.x),zs=polygon.points.map(p=>p.z);
    const area=polygon.points.reduce((sum,p,i)=>{
      const next=polygon.points[(i+1)%polygon.points.length];
      return sum+p.x*next.z-p.z*next.x;
    },0);
    if(Math.max(...xs)-Math.min(...xs)>100||Math.max(...zs)-Math.min(...zs)>100||
       !Number.isFinite(area)||Math.abs(area)<1e-4)throw TypeError('Invalid spatial polygon');
    previous=polygon.id;
  }
  let last=null;
  for(const prop of state.removedProps??[]){
    if(!Number.isInteger(prop.group)||prop.group<0||prop.group>5||
       !Number.isInteger(prop.gx)||prop.gx<-0x80000000||prop.gx>0x7fffffff||
       !Number.isInteger(prop.gz)||prop.gz<-0x80000000||prop.gz>0x7fffffff)
      throw TypeError('Invalid removed spatial prop');
    const key=[prop.group,prop.gx,prop.gz];
    if(last&&((key[0]<last[0])||(key[0]===last[0]&&key[1]<last[1])||
       (key[0]===last[0]&&key[1]===last[1]&&key[2]<=last[2])))
      throw TypeError('Removed spatial props must be sorted and unique');
    last=key;
  }
  return state;
}

export function applySpatialState(wasm,state){
  validateSpatialState(state);
  const removed=state.removedProps??[];
  if(removed.length){
    const pointer=wasm.spatial_removed_prop_restore_ptr(removed.length);
    if(!pointer)throw Error('Could not allocate removed spatial props');
    const records=new Int32Array(wasm.memory.buffer,pointer,removed.length*3);
    removed.forEach((prop,i)=>{records[i*3]=prop.group;records[i*3+1]=prop.gx;records[i*3+2]=prop.gz;});
    if(wasm.spatial_restore_removed_props(removed.length)!==1)
      throw Error('Could not restore removed spatial props');
  }
  for(const site of state.settlements){
    if(wasm.spatial_add_settlement(site.x,site.z,site.hx,site.hz)<0)
      throw Error('Could not restore spatial settlement');
  }
  const count=state.barriers.length;
  if(count){
    const pointer=wasm.spatial_barrier_restore_ptr(count);
    if(!pointer)throw Error('Could not allocate spatial barrier state');
    const records=new DataView(wasm.memory.buffer,pointer,count*28);
    state.barriers.forEach((barrier,i)=>{
      const at=i*28;
      records.setInt32(at,barrier.id,true);records.setFloat32(at+4,barrier.x,true);
      records.setFloat32(at+8,barrier.z,true);records.setFloat32(at+12,barrier.halfX,true);
      records.setFloat32(at+16,barrier.halfZ,true);records.setFloat32(at+20,barrier.yaw??0,true);
      records.setInt32(at+24,barrier.passMask,true);
    });
  }else wasm.spatial_barrier_restore_ptr(0);
  if(wasm.spatial_restore_barriers(count,state.nextBarrierId)!==1)
    throw Error('Could not restore spatial barriers');
  const polygonCount=state.polygons?.length??0;
  if(polygonCount){
    const pointer=wasm.spatial_polygon_restore_ptr(polygonCount);
    if(!pointer)throw Error('Could not allocate spatial polygon state');
    const records=new DataView(wasm.memory.buffer,pointer,polygonCount*528);
    state.polygons.forEach((polygon,i)=>{
      const at=i*528;
      records.setInt32(at,polygon.id,true);
      records.setInt32(at+4,polygon.points.length,true);
      records.setInt32(at+8,polygon.passMask,true);
      records.setInt32(at+12,0,true);
      polygon.points.forEach((point,j)=>{
        records.setFloat32(at+16+j*8,point.x,true);
        records.setFloat32(at+20+j*8,point.z,true);
      });
    });
  }else wasm.spatial_polygon_restore_ptr(0);
  if(wasm.spatial_restore_polygons(polygonCount,state.nextPolygonId??1)!==1)
    throw Error('Could not restore spatial polygons');
}
