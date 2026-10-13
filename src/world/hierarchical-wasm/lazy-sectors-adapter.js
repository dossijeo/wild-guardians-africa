// Isolated sparse-sector QA adapter. JavaScript samples physical geometry once
// per loaded sector; C++ keeps the components and cross-sector connections.
export async function createLazySectorProbe(bytes,nav,{sectorSize=12,radius=.28,worker=true,ignore=null}={}){
  const {instance}=await WebAssembly.instantiate(bytes,{env:{emscripten_notify_memory_growth(){}}});
  const wasm=instance.exports;
  if(!wasm.lazy_init(sectorSize))throw Error('Invalid lazy navigation sector size');
  const count=sectorSize*sectorSize;
  const loaded=new Set();
  const key=(sx,sz)=>`${sx},${sz}`;
  const pass=()=>new Uint8Array(wasm.memory.buffer,wasm.lazy_pass_ptr(),count);
  const steps=()=>new Uint8Array(wasm.memory.buffer,wasm.lazy_steps_ptr(),count);
  const at=(x,z)=>z*sectorSize+x;
  function loadSector(sx,sz){
    const x0=sx*sectorSize,z0=sz*sectorSize,p=pass(),e=steps();
    for(let z=0;z<sectorSize;z++)for(let x=0;x<sectorSize;x++)p[at(x,z)]=Number(nav.walkable(x0+x,z0+z,radius,ignore,worker));
    for(let z=0;z<sectorSize;z++)for(let x=0;x<sectorSize;x++){
      const index=at(x,z);if(!p[index]){e[index]=0;continue;}
      let mask=0;
      for(const [d,dx,dz] of [[0,1,0],[1,-1,0],[2,0,1],[3,0,-1]]){
        const nx=x+dx,nz=z+dz,world={x:x0+x,z:z0+z},next={x:x0+nx,z:z0+nz};
        const destinationPassable=nx>=0&&nz>=0&&nx<sectorSize&&nz<sectorSize?
          !!p[at(nx,nz)]:nav.walkable(next.x,next.z,radius,ignore,worker);
        if(destinationPassable&&nav.segmentClear(world,next,radius,ignore,worker))mask|=1<<d;
      }
      e[index]=mask;
    }
    wasm.lazy_commit_sector(sx,sz);loaded.add(key(sx,sz));
  }
  function ensureSector(sx,sz){if(!loaded.has(key(sx,sz)))loadSector(sx,sz);}
  function ensureRect(minX,minZ,maxX,maxZ){
    for(let sz=Math.floor(minZ/sectorSize);sz<=Math.floor(maxZ/sectorSize);sz++)
      for(let sx=Math.floor(minX/sectorSize);sx<=Math.floor(maxX/sectorSize);sx++)ensureSector(sx,sz);
  }
  function connected(a,b){return wasm.lazy_connected(Math.round(a.x),Math.round(a.z),Math.round(b.x),Math.round(b.z));}
  return {wasm,loadSector,ensureSector,ensureRect,connected,
    metrics:()=>({loaded:wasm.lazy_loaded_sectors(),updates:wasm.lazy_sector_updates(),memoryBytes:wasm.memory.buffer.byteLength})};
}
