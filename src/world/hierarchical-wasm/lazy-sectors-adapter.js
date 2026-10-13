// Isolated sparse-sector QA adapter. JavaScript samples physical geometry once
// per loaded sector; C++ keeps the components and cross-sector connections.
import {gatePortalPoints} from '../gate-passages.js';

export async function createLazySectorProbe(bytes,nav,{sectorSize=12,radius=.28,worker=true,ignore=null}={}){
  const {instance}=await WebAssembly.instantiate(bytes,{env:{emscripten_notify_memory_growth(){}}});
  const wasm=instance.exports;
  if(!wasm.lazy_init(sectorSize))throw Error('Invalid lazy navigation sector size');
  const count=sectorSize*sectorSize;
  const loaded=new Set();
  const portalRoutes=[];
  const key=(sx,sz)=>`${sx},${sz}`;
  const pass=()=>new Uint8Array(wasm.memory.buffer,wasm.lazy_pass_ptr(),count);
  const steps=()=>new Uint8Array(wasm.memory.buffer,wasm.lazy_steps_ptr(),count);
  const inbound=()=>new Uint8Array(wasm.memory.buffer,wasm.lazy_inbound_ptr(),count);
  const at=(x,z)=>z*sectorSize+x;
  function loadSector(sx,sz){
    const x0=sx*sectorSize,z0=sz*sectorSize,p=pass(),e=steps(),incoming=inbound();
    for(let z=0;z<sectorSize;z++)for(let x=0;x<sectorSize;x++)p[at(x,z)]=Number(nav.walkable(x0+x,z0+z,radius,ignore,worker));
    for(let z=0;z<sectorSize;z++)for(let x=0;x<sectorSize;x++){
      const index=at(x,z);if(!p[index]){e[index]=0;incoming[index]=0;continue;}
      let mask=0,incomingMask=0;
      for(const [d,dx,dz] of [[0,1,0],[1,-1,0],[2,0,1],[3,0,-1]]){
        const nx=x+dx,nz=z+dz,world={x:x0+x,z:z0+z},next={x:x0+nx,z:z0+nz};
        const inside=nx>=0&&nz>=0&&nx<sectorSize&&nz<sectorSize;
        const destinationPassable=inside?
          !!p[at(nx,nz)]:nav.walkable(next.x,next.z,radius,ignore,worker);
        const outbound=destinationPassable&&nav.segmentClear(world,next,radius,ignore,worker);
        if(outbound)mask|=1<<d;
        // A missing sector is already unknown when outbound is possible.
        // Probe the reverse direction only when it might reveal a one-way entry.
        if(!inside&&destinationPassable&&!outbound&&nav.segmentClear(next,world,radius,ignore,worker))incomingMask|=1<<d;
      }
      e[index]=mask;incoming[index]=incomingMask;
    }
    wasm.lazy_commit_sector(sx,sz);loaded.add(key(sx,sz));
  }
  function ensureSector(sx,sz){if(!loaded.has(key(sx,sz)))loadSector(sx,sz);}
  function ensureRect(minX,minZ,maxX,maxZ){
    for(let sz=Math.floor(minZ/sectorSize);sz<=Math.floor(maxZ/sectorSize);sz++)
      for(let sx=Math.floor(minX/sectorSize);sx<=Math.floor(maxX/sectorSize);sx++)ensureSector(sx,sz);
  }
  function connected(a,b){return wasm.lazy_connected(Math.round(a.x),Math.round(a.z),Math.round(b.x),Math.round(b.z));}
  function refreshPortals(){
    wasm.lazy_clear_portals();portalRoutes.length=0;
    if(worker){
      const connector=(point,outward)=>{
        const x=Math.round(point.x),z=Math.round(point.z),candidates=[];
        for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
          const cell={x:x+dx,z:z+dz};
          if(!nav.walkable(cell.x,cell.z,radius,ignore,worker))continue;
          if(!nav.segmentClear(outward?point:cell,outward?cell:point,radius,ignore,worker))continue;
          candidates.push({cell,distance:Math.hypot(cell.x-point.x,cell.z-point.z)});
        }
        candidates.sort((a,b)=>a.distance-b.distance||a.cell.x-b.cell.x||a.cell.z-b.cell.z);
        return candidates[0]?.cell;
      };
      for(const gate of nav.obstacles??[]){
        if(!gate.gate||gate.id===ignore)continue;
        const pair=gatePortalPoints(gate,radius);
        if(pair.length!==2||!nav.segmentClear(pair[0],pair[1],radius,ignore,worker))continue;
        const from=connector(pair[0],false),to=connector(pair[1],true);
        if(!from||!to)continue;
        const id=wasm.lazy_add_portal(from.x,from.z,to.x,to.z);
        portalRoutes[id*2]=pair;portalRoutes[id*2+1]=[pair[1],pair[0]];
      }
    }
    wasm.lazy_commit_portals();
  }
  function route(a,b){
    const count=wasm.lazy_route(Math.round(a.x),Math.round(a.z),Math.round(b.x),Math.round(b.z));
    if(count<0)return {status:'unknown',points:null};
    if(count===0)return {status:'blocked',points:null};
    const values=new Int32Array(wasm.memory.buffer,wasm.lazy_route_ptr(),count*2);
    const points=[];
    for(let i=0;i<count;i++){
      if(values[i*2]===-2147483648){
        const crossing=portalRoutes[values[i*2+1]];
        if(!crossing)return {status:'unknown',points:null};
        points.push(...crossing);
      }else points.push({x:values[i*2],z:values[i*2+1]});
    }
    return {status:'found',points};
  }
  refreshPortals();
  return {wasm,loadSector,ensureSector,ensureRect,connected,route,refreshPortals,
    metrics:()=>({loaded:wasm.lazy_loaded_sectors(),updates:wasm.lazy_sector_updates(),memoryBytes:wasm.memory.buffer.byteLength})};
}
