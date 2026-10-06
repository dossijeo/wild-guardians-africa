// Procedural chunks are immutable. Weak ownership drops an index with its chunk.
const indices=new WeakMap(),cellSize=8;
export function chunkPropCandidates(chunk,x,z,reach){
 let index=indices.get(chunk);
 if(!index){
  index=new Map();let order=0;
  for(const list of chunk.instances)for(const prop of list){
   const key=`${Math.floor(prop.x/cellSize)},${Math.floor(prop.z/cellSize)}`;
   let bucket=index.get(key);if(!bucket){bucket=[];index.set(key,bucket);}
   bucket.push({prop,order:order++});
  }
  indices.set(chunk,index);
 }
 const candidates=[];
 const minX=Math.floor((x-reach)/cellSize),maxX=Math.floor((x+reach)/cellSize),minZ=Math.floor((z-reach)/cellSize),maxZ=Math.floor((z+reach)/cellSize);
 for(let cz=minZ;cz<=maxZ;cz++)for(let cx=minX;cx<=maxX;cx++){
  const bucket=index.get(`${cx},${cz}`);if(bucket)candidates.push(...bucket);
 }
 candidates.sort((a,b)=>a.order-b.order);
 return candidates;
}
