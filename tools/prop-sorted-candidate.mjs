// Experimental only: immutable procedural chunk positions, live suppression.
// Unlike the grid pilot, narrow queries use one binary search without cell keys.
const indexes=new WeakMap();
export function candidateSortedProps(x,z,radius){
 const result=[],reach=radius+8;
 for(let cz=Math.floor((z-radius+24)/48);cz<=Math.floor((z+radius+24)/48);cz++)for(let cx=Math.floor((x-radius+24)/48);cx<=Math.floor((x+radius+24)/48);cx++){
  const chunk=this.chunk(cx,cz);
  if(reach>16){
   for(const list of chunk.instances)for(const p of list)if(Math.abs(p.x-x)<reach&&Math.abs(p.z-z)<reach&&Math.hypot(p.x-x,p.z-z)<reach&&!this.suppressed.has(p.id))result.push(p);
   continue;
  }
  let index=indexes.get(chunk);
  if(!index){index=chunk.instances.flat().map((p,order)=>({p,order})).sort((a,b)=>a.p.x-b.p.x||a.order-b.order);indexes.set(chunk,index);}
  let low=0,high=index.length;
  while(low<high){const mid=(low+high)>>>1;if(index[mid].p.x<=x-reach)low=mid+1;else high=mid;}
  const candidates=[];
  for(let i=low;i<index.length&&index[i].p.x<x+reach;i++){
   const entry=index[i],p=entry.p;
   if(Math.abs(p.z-z)<reach&&Math.hypot(p.x-x,p.z-z)<reach&&!this.suppressed.has(p.id))candidates.push(entry);
  }
  candidates.sort((a,b)=>a.order-b.order);
  for(const entry of candidates)result.push(entry.p);
 }
 return result;
}
