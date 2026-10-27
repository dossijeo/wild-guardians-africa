// Renderer-facing copies of the C++ chunk buffers. This module deliberately
// has no Three.js or terrain-generator dependency so it can run in a worker.
export function spatialProps(wasm){
  const count=wasm.spatial_prop_count(),view=new DataView(wasm.memory.buffer,wasm.spatial_props_ptr(),count*40);
  return Array.from({length:count},(_,i)=>{
    const at=i*40;
    return {x:view.getFloat32(at,true),z:view.getFloat32(at+4,true),y:view.getFloat32(at+8,true),
      radius:view.getFloat32(at+12,true),scale:view.getFloat32(at+16,true),yaw:view.getFloat32(at+20,true),
      slot:view.getInt32(at+24,true),group:view.getInt32(at+28,true),gx:view.getInt32(at+32,true),gz:view.getInt32(at+36,true)};
  });
}

export function spatialInstances(wasm,cx,cz){
  const lists=Array.from({length:20},()=>[]);
  for(const prop of spatialProps(wasm)){
    const {slot,scale,group,gx,gz,...position}=prop;
    lists[slot].push({id:`spatial:${group}:${gx}:${gz}`,slot,...position,
      scale,sx:scale,sy:scale,sz:scale,tint:1,priority:0});
  }
  return lists;
}

export function spatialChunkPayload(wasm,cx,cz){
  // A deferred selected payload may grow WASM memory: resolve it first.
  const groundPointer=wasm.spatial_heights_ptr(),memory=wasm.memory.buffer;
  const ground=new Float32Array(memory,groundPointer,49*49);
  const rgb=new Float32Array(memory,wasm.spatial_colors_ptr(),49*49*3);
  const positions=new Float32Array(49*49*3),indices=new Uint16Array(48*48*6);
  for(let z=0;z<49;z++)for(let x=0;x<49;x++){
    const i=z*49+x;positions[i*3]=x-24;positions[i*3+1]=ground[i];positions[i*3+2]=z-24;
  }
  for(let z=0;z<48;z++)for(let x=0;x<48;x++){
    const i=z*48+x,k=i*6,a=z*49+x,b=a+1,d=a+49,c=d+1;
    indices.set([a,d,b,b,d,c],k);
  }
  const river=new Float32Array(memory,wasm.spatial_water_triangles_ptr(),wasm.spatial_water_vertex_count()*3).slice();
  for(let i=0;i<river.length;i+=3){river[i]-=cx*48;river[i+2]-=cz*48;}
  const groundMask=new Uint8Array(memory,wasm.spatial_ground_mask_ptr(),35*35*4).slice();
  return {authority:'spatial-wasm',cx,cz,terrain:{positions,colors:rgb.slice(),indices},water:river,
    groundMask,instances:spatialInstances(wasm,cx,cz)};
}

export const spatialChunkTransferables=data=>[
  data.terrain.positions.buffer,data.terrain.colors.buffer,data.terrain.indices.buffer,
  data.water.buffer,data.groundMask.buffer
];
