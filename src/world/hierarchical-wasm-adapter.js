// The geometry raster is transferred in two contiguous byte buffers. The
// compiled core owns the raster, sector components, abstract graph, and A*.
// Physical movement and collision validation stay in the JavaScript engine.
export async function createHierarchicalWasmNavigator(bytes,nav,{minX,minZ,maxX,maxZ,radius,worker=false,ignore=null,sectorSize=12,diagonal=false}){
  const {instance}=await WebAssembly.instantiate(bytes,{env:{emscripten_notify_memory_growth(){}}});
  const wasm=instance.exports,width=maxX-minX+1,height=maxZ-minZ+1;
  if(!wasm.nav_init(minX,minZ,width,height,sectorSize))throw Error('Invalid WASM navigation grid');
  const count=width*height,point=(x,z)=>({x,z});
  const buffers=()=>({pass:new Uint8Array(wasm.memory.buffer,wasm.nav_pass_ptr(),count),
    steps:new Uint8Array(wasm.memory.buffer,wasm.nav_steps_ptr(),count),
    diagonals:new Uint8Array(wasm.memory.buffer,wasm.nav_diag_ptr(),count)});
  function rasterCell(x,z,pass,steps,diagonals){
    const i=(z-minZ)*width+x-minX;
    pass[i]=Number(nav.walkable(x,z,radius,ignore,worker));
    if(!pass[i]){steps[i]=0;diagonals[i]=0;return;}
    let mask=0;
    for(const [d,dx,dz] of [[0,1,0],[1,-1,0],[2,0,1],[3,0,-1]]){
      const nx=x+dx,nz=z+dz;
      if(nx<minX||nx>maxX||nz<minZ||nz>maxZ)continue;
      if(nav.walkable(nx,nz,radius,ignore,worker)&&nav.segmentClear(point(x,z),point(nx,nz),radius,ignore,worker))mask|=1<<d;
    }
    steps[i]=mask;
    if(!diagonal){diagonals[i]=0;return;}
    let diagonalMask=0;
    for(const [d,dx,dz] of [[0,1,1],[1,-1,1],[2,1,-1],[3,-1,-1]]){
      const nx=x+dx,nz=z+dz;
      if(nx<minX||nx>maxX||nz<minZ||nz>maxZ)continue;
      if(!nav.walkable(nx,nz,radius,ignore,worker)||!nav.walkable(x+dx,z,radius,ignore,worker)||!nav.walkable(x,z+dz,radius,ignore,worker))continue;
      if(nav.segmentClear(point(x,z),point(nx,nz),radius,ignore,worker))diagonalMask|=1<<d;
    }
    diagonals[i]=diagonalMask;
  }
  function syncRect(x0=minX,z0=minZ,x1=maxX,z1=maxZ){
    const a=Math.max(minX,Math.floor(x0)-1),b=Math.min(maxX,Math.ceil(x1)+1);
    const c=Math.max(minZ,Math.floor(z0)-1),d=Math.min(maxZ,Math.ceil(z1)+1);
    const {pass,steps,diagonals}=buffers();
    for(let z=c;z<=d;z++)for(let x=a;x<=b;x++)rasterCell(x,z,pass,steps,diagonals);
    return wasm.nav_refresh(a,c,b-a+1,d-c+1);
  }
  function initialize(){
    const {pass,steps,diagonals}=buffers();
    for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++)rasterCell(x,z,pass,steps,diagonals);
    return wasm.nav_commit();
  }
  function route(start,end){
    const n=wasm.nav_route(Math.round(start.x),Math.round(start.z),Math.round(end.x),Math.round(end.z));
    if(n<=0)return null;
    const indices=new Int32Array(wasm.memory.buffer,wasm.nav_route_ptr(),n);
    return Array.from(indices,i=>point(minX+i%width,minZ+Math.floor(i/width)));
  }
  function flatRoute(start,end){
    const n=wasm.nav_route_flat(Math.round(start.x),Math.round(start.z),Math.round(end.x),Math.round(end.z));
    if(n<=0)return null;
    const indices=new Int32Array(wasm.memory.buffer,wasm.nav_route_ptr(),n);
    return Array.from(indices,i=>point(minX+i%width,minZ+Math.floor(i/width)));
  }
  return {wasm,initialize,syncRect,route,flatRoute,bytes:bytes.byteLength,dimensions:{width,height},
    metrics:()=>({sectorsBuilt:wasm.nav_sectors_built(),arcs:wasm.nav_arc_count(),graphNodes:wasm.nav_graph_nodes(),localNodes:wasm.nav_local_nodes(),flatNodes:wasm.nav_flat_nodes()})};
}
