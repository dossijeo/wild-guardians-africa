// The geometry raster is transferred in two contiguous byte buffers. The
// compiled core owns the raster, sector components, abstract graph, and A*.
// Physical movement and collision validation stay in the JavaScript engine.
import {gatePortalPoints} from './gate-passages.js';

export async function createHierarchicalWasmNavigator(bytes,nav,{minX,minZ,maxX,maxZ,radius,worker=false,ignore=null,sectorSize=12,diagonal=false}){
  const {instance}=await WebAssembly.instantiate(bytes,{env:{emscripten_notify_memory_growth(){}}});
  return createNavigator(instance,bytes.byteLength,nav,{minX,minZ,maxX,maxZ,radius,worker,ignore,sectorSize,diagonal});
}

// QA runners can compile the module before the simulation and use this
// synchronous entry point from the game's synchronous Navigation.path API.
export function createHierarchicalWasmNavigatorSync(module,nav,{minX,minZ,maxX,maxZ,radius,worker=false,ignore=null,sectorSize=12,diagonal=false}){
  const instance=new WebAssembly.Instance(module,{env:{emscripten_notify_memory_growth(){}}});
  return createNavigator(instance,null,nav,{minX,minZ,maxX,maxZ,radius,worker,ignore,sectorSize,diagonal});
}

function createNavigator(instance,bytesLength,nav,{minX,minZ,maxX,maxZ,radius,worker,ignore,sectorSize,diagonal}){
  const wasm=instance.exports,width=maxX-minX+1,height=maxZ-minZ+1;
  if(!wasm.nav_init(minX,minZ,width,height,sectorSize))throw Error('Invalid WASM navigation grid');
  const count=width*height,point=(x,z)=>({x,z});
  const buffers=()=>({pass:new Uint8Array(wasm.memory.buffer,wasm.nav_pass_ptr(),count),
    steps:new Uint8Array(wasm.memory.buffer,wasm.nav_steps_ptr(),count),
    diagonals:new Uint8Array(wasm.memory.buffer,wasm.nav_diag_ptr(),count)});
  const portalRoutes=[];
  let treeOrigin=null;
  const rasterIndex=(x,z)=>(z-minZ)*width+x-minX;
  const inBounds=(x,z)=>x>=minX&&x<=maxX&&z>=minZ&&z<=maxZ;
  function sampleCell(x,z,pass){
    pass[rasterIndex(x,z)]=Number(nav.walkable(x,z,radius,ignore,worker));
  }
  function sampleEdges(x,z,pass,steps,diagonals){
    const i=rasterIndex(x,z);
    if(!pass[i]){steps[i]=0;diagonals[i]=0;return;}
    let mask=0;
    for(const [d,dx,dz] of [[0,1,0],[1,-1,0],[2,0,1],[3,0,-1]]){
      const nx=x+dx,nz=z+dz;
      if(!inBounds(nx,nz)||!pass[rasterIndex(nx,nz)])continue;
      if(nav.segmentClear(point(x,z),point(nx,nz),radius,ignore,worker))mask|=1<<d;
    }
    steps[i]=mask;
    if(!diagonal){diagonals[i]=0;return;}
    let diagonalMask=0;
    for(const [d,dx,dz] of [[0,1,1],[1,-1,1],[2,1,-1],[3,-1,-1]]){
      const nx=x+dx,nz=z+dz;
      if(!inBounds(nx,nz)||!pass[rasterIndex(nx,nz)]||!pass[rasterIndex(x+dx,z)]||!pass[rasterIndex(x,z+dz)])continue;
      if(nav.segmentClear(point(x,z),point(nx,nz),radius,ignore,worker))diagonalMask|=1<<d;
    }
    diagonals[i]=diagonalMask;
  }
  function syncRect(x0=minX,z0=minZ,x1=maxX,z1=maxZ){
    treeOrigin=null;
    const a=Math.max(minX,Math.floor(x0)-1),b=Math.min(maxX,Math.ceil(x1)+1);
    const c=Math.max(minZ,Math.floor(z0)-1),d=Math.min(maxZ,Math.ceil(z1)+1);
    const {pass,steps,diagonals}=buffers();
    for(let z=c;z<=d;z++)for(let x=a;x<=b;x++)sampleCell(x,z,pass);
    for(let z=c;z<=d;z++)for(let x=a;x<=b;x++)sampleEdges(x,z,pass,steps,diagonals);
    wasm.nav_refresh(a,c,b-a+1,d-c+1);
    return refreshPortals();
  }
  function refreshPortals(){
    treeOrigin=null;
    wasm.nav_clear_portals();portalRoutes.length=0;
    if(worker){
      const {pass}=buffers();
      const connector=(point,outward)=>{
        const x=Math.round(point.x),z=Math.round(point.z),candidates=[];
        for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
          const cell={x:x+dx,z:z+dz};
          if(!inBounds(cell.x,cell.z)||!pass[rasterIndex(cell.x,cell.z)])continue;
          if(!nav.segmentClear(outward?point:cell,outward?cell:point,radius,ignore,worker))continue;
          candidates.push({cell,distance:Math.hypot(cell.x-point.x,cell.z-point.z)});
        }
        candidates.sort((a,b)=>a.distance-b.distance||a.cell.x-b.cell.x||a.cell.z-b.cell.z);
        return candidates[0]?.cell;
      };
      for(const gate of nav.obstacles){
        if(!gate.gate||gate.id===ignore)continue;
        const pair=gatePortalPoints(gate,radius);
        if(pair.length!==2||!nav.segmentClear(pair[0],pair[1],radius,ignore,worker))continue;
        const from=connector(pair[0],false),to=connector(pair[1],true);
        if(!from||!to)continue;
        const id=wasm.nav_add_portal(from.x,from.z,to.x,to.z);
        if(id<0)continue;
        portalRoutes[id*2]=pair;
        portalRoutes[id*2+1]=[pair[1],pair[0]];
      }
    }
    return wasm.nav_commit_portals();
  }
  function initialize(){
    treeOrigin=null;
    const {pass,steps,diagonals}=buffers();
    for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++)sampleCell(x,z,pass);
    for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++)sampleEdges(x,z,pass,steps,diagonals);
    wasm.nav_commit();return refreshPortals();
  }
  const decode=i=>i>=0?point(minX+i%width,minZ+Math.floor(i/width)):
    portalRoutes[Math.floor((-1-i)/2)]?.[(-1-i)%2]??null;
  function route(start,end){
    const n=wasm.nav_route(Math.round(start.x),Math.round(start.z),Math.round(end.x),Math.round(end.z));
    if(n<=0)return null;
    const indices=new Int32Array(wasm.memory.buffer,wasm.nav_route_ptr(),n);
    return Array.from(indices,decode);
  }
  function flatRoute(start,end){
    const n=wasm.nav_route_flat(Math.round(start.x),Math.round(start.z),Math.round(end.x),Math.round(end.z));
    if(n<=0)return null;
    const indices=new Int32Array(wasm.memory.buffer,wasm.nav_route_ptr(),n);
    return Array.from(indices,decode);
  }
  function treeRoute(start,end){
    const sx=Math.round(start.x),sz=Math.round(start.z);
    if(!treeOrigin||treeOrigin.x!==sx||treeOrigin.z!==sz){
      if(!wasm.nav_tree_begin(sx,sz))return null;
      treeOrigin={x:sx,z:sz};
    }
    const n=wasm.nav_tree_route(Math.round(end.x),Math.round(end.z));
    if(n<=0)return null;
    const indices=new Int32Array(wasm.memory.buffer,wasm.nav_route_ptr(),n);
    return Array.from(indices,decode);
  }
  function region(point){
    const x=Math.round(point.x),z=Math.round(point.z),candidates=[];
    const direct=wasm.nav_component(x,z);
    if(direct>=0&&nav.segmentClear(point,{x,z},radius,ignore,worker))return {key:String(direct),id:direct,cell:{x,z}};
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      if(dx===0&&dz===0)continue;
      const cell={x:x+dx,z:z+dz},id=wasm.nav_component(cell.x,cell.z);
      if(id<0||!nav.segmentClear(point,cell,radius,ignore,worker))continue;
      candidates.push({id,cell,distance:Math.hypot(cell.x-point.x,cell.z-point.z)});
    }
    candidates.sort((a,b)=>a.distance-b.distance||a.cell.x-b.cell.x||a.cell.z-b.cell.z);
    const result=candidates[0];return result?{key:String(result.id),id:result.id,cell:result.cell}:null;
  }
  function connectors(position,outward){
    const x=Math.round(position.x),z=Math.round(position.z),cells=[];
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const cell={x:x+dx,z:z+dz};
      const id=wasm.nav_component(cell.x,cell.z);
      if(id<0)continue;
      if(!nav.segmentClear(outward?position:cell,outward?cell:position,radius,ignore,worker))continue;
      cells.push({cell,id,distance:Math.hypot(cell.x-position.x,cell.z-position.z)});
    }
    cells.sort((a,b)=>a.distance-b.distance||a.cell.x-b.cell.x||a.cell.z-b.cell.z);
    return cells;
  }
  function path(start,end,{flat=false,tree=false}={}){
    if(nav.segmentClear(start,end,radius,ignore,worker))return [{x:end.x,z:end.z}];
    const sources=connectors(start,true),targets=connectors(end,false);
    for(const source of sources)for(const target of targets){
      // Different graph regions cannot have a route. This shared decision
      // prevents both search cores from exploring every unreachable pairing.
      if(source.id!==target.id)continue;
      const middle=source.cell.x===target.cell.x&&source.cell.z===target.cell.z?[]:
        (tree?treeRoute(source.cell,target.cell):flat?flatRoute(source.cell,target.cell):route(source.cell,target.cell));
      if(!middle)continue;
      const result=[source.cell,...middle,{x:end.x,z:end.z}];
      let previous=start,valid=true;
      for(const point of result){
        if(!point||!nav.segmentClear(previous,point,radius,ignore,worker)){valid=false;break;}
        previous=point;
      }
      if(valid)return result;
    }
    return null;
  }
  return {wasm,initialize,syncRect,route,flatRoute,treeRoute,path,region,bytes:bytesLength,dimensions:{width,height},
    metrics:()=>({sectorsBuilt:wasm.nav_sectors_built(),arcs:wasm.nav_arc_count(),graphNodes:wasm.nav_graph_nodes(),localNodes:wasm.nav_local_nodes(),flatNodes:wasm.nav_flat_nodes(),treeNodes:wasm.nav_tree_nodes()})};
}
