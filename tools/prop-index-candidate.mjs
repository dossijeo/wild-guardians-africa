// Diagnostic candidate only. Native chunk instances are immutable; suppression
// remains a live query input. Weak keys release indexes when chunks are evicted.
const indexes=new WeakMap(),cell=8;
export function candidateIndexedProps(x,z,radius){
 const result=[],reach=radius+8;
 for(let cz=Math.floor((z-radius+24)/48);cz<=Math.floor((z+radius+24)/48);cz++)for(let cx=Math.floor((x-radius+24)/48);cx<=Math.floor((x+radius+24)/48);cx++){
  const chunk=this.chunk(cx,cz);
  if(reach>16){
   for(const list of chunk.instances)for(const p of list)if(Math.hypot(p.x-x,p.z-z)<reach&&!this.suppressed.has(p.id))result.push(p);
   continue;
  }
  let index=indexes.get(chunk);
  if(!index){
   const points=chunk.instances.flat(),bins=new Map();
   points.forEach((p,i)=>{const key=Math.floor(p.x/cell)+','+Math.floor(p.z/cell);if(!bins.has(key))bins.set(key,[]);bins.get(key).push(i);});
   index={points,bins};indexes.set(chunk,index);
  }
  const candidates=[];
  for(let bz=Math.floor((z-reach)/cell);bz<=Math.floor((z+reach)/cell);bz++)for(let bx=Math.floor((x-reach)/cell);bx<=Math.floor((x+reach)/cell);bx++)candidates.push(...index.bins.get(bx+','+bz)??[]);
  candidates.sort((a,b)=>a-b);
  for(const i of candidates){const p=index.points[i];if(Math.hypot(p.x-x,p.z-z)<reach&&!this.suppressed.has(p.id))result.push(p);}
 }
 return result;
}
