// QA-only reduced prototype: discrete animal movement graph by 16x16 chunks.
// Native geometry fills cells and edges on first use within a chunk; later
// route expansions consult only discrete values. Fractional start/end
// connectors remain exact physical queries.
const SIZE=16;
const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
const tileIndex=(x,z)=>((z%SIZE+SIZE)%SIZE)*SIZE+(x%SIZE+SIZE)%SIZE;
export function logicalAnimalGrid(nav,metrics={}){
  if(nav.__logicalAnimalGrid?.version===nav.version)return nav.__logicalAnimalGrid;
  Object.assign(metrics,{chunks:0,cells:0,edges:0,buildMilliseconds:0,edgeLookups:0});
  const chunks=new Map(),radiusKey=radius=>String(radius),chunkCoord=x=>Math.floor(x/SIZE);
  const key=(x,z,radius)=>`${radiusKey(radius)}:${chunkCoord(x)},${chunkCoord(z)}`;
  function get(x,z,radius){
    const k=key(x,z,radius);let chunk=chunks.get(k);if(chunk)return chunk;
    const cx=chunkCoord(x),cz=chunkCoord(z);
    chunk={cx,cz,walk:new Int8Array(SIZE*SIZE),edges:new Uint8Array(SIZE*SIZE),known:new Uint8Array(SIZE*SIZE)};
    chunks.set(k,chunk);metrics.chunks++;
    return chunk;
  }
  const grid={version:nav.version,chunks,metrics,
    walkable(x,z,radius){
      const chunk=get(x,z,radius),i=tileIndex(x,z);
      if(!chunk.walk[i]){
        const began=performance.now();chunk.walk[i]=nav.walkable(x,z,radius,null,false)?1:-1;
        metrics.cells++;metrics.buildMilliseconds+=performance.now()-began;
      }
      return chunk.walk[i]===1;
    },
    step(x,z,nx,nz,radius,direction){
      metrics.edgeLookups++;
      const d=direction??directions.findIndex(([ax,az])=>ax===nx-x&&az===nz-z);
      if(d<0)return false;
      const chunk=get(x,z,radius),i=tileIndex(x,z),bit=1<<d;
      if(!(chunk.known[i]&bit)){
        const began=performance.now(),[dx,dz]=directions[d];
        let clear=grid.walkable(nx,nz,radius);
        if(dx&&dz)clear=clear&&grid.walkable(x+dx,z,radius)&&grid.walkable(x,z+dz,radius);
        if(clear)clear=nav.segmentClear({x,z},{x:nx,z:nz},radius,null,false);
        chunk.known[i]|=bit;if(clear)chunk.edges[i]|=bit;
        metrics.edges++;metrics.buildMilliseconds+=performance.now()-began;
      }
      return !!(chunk.edges[i]&bit);
    },
  };
  nav.__logicalAnimalGrid=grid;
  return grid;
}
