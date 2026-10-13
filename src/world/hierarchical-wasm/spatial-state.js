// Compact, versioned QA snapshot of the C++ spatial authority. Residency and
// route trees are derived data; only the seed and authorized topology persist.
export function captureSpatialState(wasm){
  const settlements=[];
  const siteCount=wasm.spatial_settlement_state_count();
  const sitePointer=wasm.spatial_settlement_state_ptr();
  const sites=new DataView(wasm.memory.buffer,sitePointer,siteCount*16);
  for(let i=0;i<siteCount;i++){
    const at=i*16;
    settlements.push({x:sites.getFloat32(at,true),z:sites.getFloat32(at+4,true),
      hx:sites.getFloat32(at+8,true),hz:sites.getFloat32(at+12,true)});
  }
  const barriers=[];
  const barrierCount=wasm.spatial_barrier_state_count();
  const barrierPointer=wasm.spatial_barrier_state_ptr();
  const records=new DataView(wasm.memory.buffer,barrierPointer,barrierCount*24);
  for(let i=0;i<barrierCount;i++){
    const at=i*24;
    barriers.push({id:records.getInt32(at,true),x:records.getFloat32(at+4,true),
      z:records.getFloat32(at+8,true),halfX:records.getFloat32(at+12,true),
      halfZ:records.getFloat32(at+16,true),passMask:records.getInt32(at+20,true)});
  }
  const removedProps=[],removedCount=wasm.spatial_removed_prop_count();
  const removed=new Int32Array(wasm.memory.buffer,wasm.spatial_removed_prop_state_ptr(),removedCount*3);
  for(let i=0;i<removedCount;i++)removedProps.push({group:removed[i*3],gx:removed[i*3+1],gz:removed[i*3+2]});
  return {version:3,biome:wasm.spatial_world_biome()===1?'desert':
    wasm.spatial_world_biome()===2?'grand_river':wasm.spatial_world_biome()===3?'volcanoes':'savanna',
    seed:wasm.spatial_world_seed()>>>0,settlements,barriers,removedProps,
    nextBarrierId:wasm.spatial_next_barrier_id()};
}

export function validateSpatialState(state){
  const finiteF32=value=>Number.isFinite(value)&&Number.isFinite(Math.fround(value));
  if((state?.version!==1&&state?.version!==2&&state?.version!==3)||
     (state.version>=2&&!['savanna','desert','grand_river','volcanoes'].includes(state.biome))||
     !Number.isInteger(state.seed)||state.seed<0||state.seed>0xffffffff||
     !Array.isArray(state.settlements)||!Array.isArray(state.barriers)||
     (state.version===3&&(!Array.isArray(state.removedProps)||state.removedProps.length>100000))||
     state.settlements.length>100000||state.barriers.length>100000||
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
      barrier.halfX<=0||barrier.halfZ<=0||barrier.halfX>100||barrier.halfZ>100||
      !Number.isInteger(barrier.passMask)||barrier.passMask<0||barrier.passMask>3)
      throw TypeError('Invalid spatial barrier');
    previous=barrier.id;
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
    const records=new DataView(wasm.memory.buffer,pointer,count*24);
    state.barriers.forEach((barrier,i)=>{
      const at=i*24;
      records.setInt32(at,barrier.id,true);records.setFloat32(at+4,barrier.x,true);
      records.setFloat32(at+8,barrier.z,true);records.setFloat32(at+12,barrier.halfX,true);
      records.setFloat32(at+16,barrier.halfZ,true);records.setInt32(at+20,barrier.passMask,true);
    });
  }else wasm.spatial_barrier_restore_ptr(0);
  if(wasm.spatial_restore_barriers(count,state.nextBarrierId)!==1)
    throw Error('Could not restore spatial barriers');
}
