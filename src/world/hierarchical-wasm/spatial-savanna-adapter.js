import * as THREE from 'three';

// QA-only adapter. The C++ module owns all procedural and collision data;
// JavaScript only copies its display buffers into Three.js-owned geometry.
export function createSpatialSavannaPrototype(module){
  const wasm=new WebAssembly.Instance(module,{env:{emscripten_notify_memory_growth(){}}}).exports;
  let chunk=null,navigationBuilt=false,chunks=[],generated=false;
  const heights=()=>new Float32Array(wasm.memory.buffer,wasm.spatial_heights_ptr(),49*49);
  const colors=()=>new Float32Array(wasm.memory.buffer,wasm.spatial_colors_ptr(),49*49*3);
  const water=()=>new Uint8Array(wasm.memory.buffer,wasm.spatial_water_ptr(),48*48);
  const waterLevels=()=>new Float32Array(wasm.memory.buffer,wasm.spatial_water_levels_ptr(),48*48);
  function generate(seed,cx,cz){
    const count=wasm.spatial_generate(seed>>>0,cx|0,cz|0);
    chunk={cx:cx|0,cz:cz|0,count};chunks=[[cx|0,cz|0]];navigationBuilt=false;generated=true;
    return chunk;
  }
  function addChunk(cx,cz){
    if(!generated)throw Error('Generate the world before adding a chunk');
    const result=wasm.spatial_add_chunk(cx|0,cz|0);
    if(result>0){chunk={cx:cx|0,cz:cz|0,count:result-1};chunks.push([cx|0,cz|0]);}
    return result>0?result-1:result;
  }
  function removeChunk(cx,cz){
    const removed=wasm.spatial_remove_chunk(cx|0,cz|0);
    if(removed){
      chunks=chunks.filter(([x,z])=>x!==(cx|0)||z!==(cz|0));
      if(chunk?.cx===(cx|0)&&chunk?.cz===(cz|0)){
        const last=chunks.at(-1);
        chunk=last?{cx:last[0],cz:last[1],count:wasm.spatial_prop_count()}:null;
      }
    }
    return removed;
  }
  function props(){
    const count=wasm.spatial_prop_count(),view=new DataView(wasm.memory.buffer,wasm.spatial_props_ptr(),count*28);
    return Array.from({length:count},(_,i)=>{
      const at=i*28;
      return {x:view.getFloat32(at,true),z:view.getFloat32(at+4,true),y:view.getFloat32(at+8,true),
        radius:view.getFloat32(at+12,true),scale:view.getFloat32(at+16,true),yaw:view.getFloat32(at+20,true),slot:view.getInt32(at+24,true)};
    });
  }
  function instances(){
    if(!chunk)throw Error('Generate a chunk before reading prop instances');
    const lists=Array.from({length:20},()=>[]);
    for(const [index,prop] of props().entries()){
      const {slot,scale,...position}=prop;
      lists[slot].push({id:`spatial:${chunk.cx}:${chunk.cz}:${index}`,slot,...position,
        scale,sx:scale,sy:scale,sz:scale,tint:1,priority:0});
    }
    return lists;
  }
  function geometry(){
    if(!chunk)throw Error('Generate a chunk before building its geometry');
    const {cx,cz}=chunk,ground=heights(),rgb=colors(),positions=new Float32Array(49*49*3);
    for(let z=0;z<49;z++)for(let x=0;x<49;x++){
      const i=z*49+x;positions[i*3]=cx*48-24+x;positions[i*3+1]=ground[i];positions[i*3+2]=cz*48-24+z;
    }
    const indices=new Uint16Array(48*48*6);
    for(let z=0;z<48;z++)for(let x=0;x<48;x++){
      const i=z*48+x,k=i*6,a=z*49+x,b=a+1,d=a+49,c=d+1;
      indices.set([a,d,b,b,d,c],k);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
    geo.setAttribute('color',new THREE.BufferAttribute(Float32Array.from(rgb),3));
    geo.setIndex(new THREE.BufferAttribute(indices,1));geo.computeVertexNormals();
    return geo;
  }
  function waterGeometry(){
    if(!chunk)throw Error('Generate a chunk before building its water');
    const mask=water(),levels=waterLevels(),positions=[],indices=[];
    for(let z=0;z<48;z++)for(let x=0;x<48;x++)if(mask[z*48+x]){
      const wx=chunk.cx*48-24+x,wz=chunk.cz*48-24+z,i=positions.length/3,y=levels[z*48+x];
      positions.push(wx,y,wz,wx+1,y,wz,wx,y,wz+1,wx+1,y,wz+1);
      indices.push(i,i+2,i+1,i+1,i+2,i+3);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geo.setIndex(indices);geo.computeVertexNormals();return geo;
  }
  function route(start,end){
    if(!navigationBuilt)return {status:'unknown',points:[]};
    const count=wasm.lazy_route(start.x|0,start.z|0,end.x|0,end.z|0);
    if(count<0)return {status:'unknown',points:[]};
    if(!count)return {status:'blocked',points:[]};
    const pairs=new Int32Array(wasm.memory.buffer,wasm.lazy_route_ptr(),count*2),points=[];
    for(let i=0;i<count;i++)points.push({x:pairs[i*2],z:pairs[i*2+1]});
    return {status:'found',points};
  }
  return {wasm,generate,addChunk,removeChunk,heights,colors,water,waterLevels,props,instances,geometry,waterGeometry,route,
    buildNavigation:(radius,worker)=>{
      if(!chunk)throw Error('Generate a chunk before building its navigation');
      const loaded=wasm.spatial_build_nav(radius,worker?1:0);
      navigationBuilt=loaded>0;return loaded;
    },
    addWall:(x,z,halfX,halfZ)=>wasm.spatial_add_wall(x,z,halfX,halfZ),
    removeWall:id=>wasm.spatial_remove_wall(id),
    walkable:(x,z)=>Boolean(wasm.spatial_walkable(x,z)),
    edge:(x,z,nx,nz)=>Boolean(wasm.spatial_edge(x,z,nx,nz)),
    propBlocked:(x,z)=>Boolean(wasm.spatial_prop_blocked(x,z)),
    metrics:()=>({memoryBytes:wasm.memory.buffer.byteLength,loadedChunks:wasm.spatial_chunk_count(),loadedSectors:wasm.lazy_loaded_sectors(),
      sectorSlots:wasm.spatial_sector_slots(),
      sectorUpdates:wasm.lazy_sector_updates(),haloProps:wasm.spatial_halo_prop_count()})};
}
