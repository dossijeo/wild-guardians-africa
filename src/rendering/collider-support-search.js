// Conservative block bounds skip points that cannot beat the current support.
// Original point order and strict comparison preserve deterministic tie choices.
export function colliderSupportSearch(points,directions){
 if(points.length<128)return directions.map(({x,y,z})=>{
  let best=-Infinity,winner=0;
  for(let i=0;i<points.length;i++){const p=points[i],dot=p.x*x+p.y*y+p.z*z;if(dot>best){best=dot;winner=i;}}
  return winner;
 });
 const size=32,blocks=[];
 for(let start=0;start<points.length;start+=size){
  const end=Math.min(points.length,start+size);let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  for(let i=start;i<end;i++){const p=points[i];minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);minZ=Math.min(minZ,p.z);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);maxZ=Math.max(maxZ,p.z);}
  blocks.push({start,end,minX,minY,minZ,maxX,maxY,maxZ});
 }
 return directions.map(({x,y,z})=>{
  let best=-Infinity,winner=0;
  for(const b of blocks){
   const bound=(x>=0?b.maxX:b.minX)*x+(y>=0?b.maxY:b.minY)*y+(z>=0?b.maxZ:b.minZ)*z;
   if(bound<=best)continue;
   for(let i=b.start;i<b.end;i++){const p=points[i],dot=p.x*x+p.y*y+p.z*z;if(dot>best){best=dot;winner=i;}}
  }
  return winner;
 });
}
