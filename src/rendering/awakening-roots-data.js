import {AWAKENINGS as A} from '../simulation/awakening-config.js';

// Presentation-only paths. Their random-looking curves never consume the game RNG.
function hash(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967296;}
export function awakeningRootPaths(source,plants){
  const neighbors=plants.filter(p=>p.alive&&!p.blessing&&Math.hypot(p.x-source.x,p.z-source.z)<=A.radius+1e-9)
    .sort((a,b)=>Math.hypot(a.x-source.x,a.z-source.z)-Math.hypot(b.x-source.x,b.z-source.z)||a.id.localeCompare(b.id)).slice(0,6);
  const targets=neighbors.length?neighbors:Array.from({length:3},(_,i)=>{
    const angle=hash(source.id)*Math.PI*2+i*Math.PI*2/3;
    return {id:'stub-'+i,x:source.x+Math.cos(angle)*.65,z:source.z+Math.sin(angle)*.65};
  });
  const paths=[];
  for(const target of targets){
    const dx=target.x-source.x,dz=target.z-source.z,length=Math.hypot(dx,dz);
    if(length<.01)continue;
    const nx=-dz/length,nz=dx/length,phase=hash(source.id+':'+target.id)*Math.PI*2,points=[];
    for(let i=0;i<=20;i++){
      const t=i/20,d=.14+(Math.max(.2,length-.15)-.14)*t;
      const bend=Math.sin(Math.PI*t)*Math.sin(t*7+phase)*.16;
      points.push({x:source.x+dx/length*d+nx*bend,z:source.z+dz/length*d+nz*bend,strength:1-t*.65});
    }
    paths.push(points);
    // One short offshoot, never a map-wide decorative network.
    const at=points[11],side=hash(target.id)>.5?1:-1;
    paths.push([at,{x:at.x+dx*.07+nx*.17*side,z:at.z+dz*.07+nz*.17*side,strength:.25},
      {x:at.x+dx*.12+nx*.25*side,z:at.z+dz*.12+nz*.25*side,strength:0}]);
  }
  return paths;
}
export function rasterizeAwakeningRoots(paths,bounds,resolution=512){
  if(!Number.isSafeInteger(resolution)||resolution<16||resolution>1024)throw RangeError('Invalid root-mask resolution');
  const pixels=new Uint8Array(resolution*resolution),pixel=bounds.size/resolution;
  const brush=(x,z,strength)=>{
    const radius=.028+pixel*.7,cx=(x-bounds.minX)/pixel-.5,cz=(z-bounds.minZ)/pixel-.5,r=radius/pixel;
    for(let iz=Math.max(0,Math.floor(cz-r));iz<=Math.min(resolution-1,Math.ceil(cz+r));iz++)
      for(let ix=Math.max(0,Math.floor(cx-r));ix<=Math.min(resolution-1,Math.ceil(cx+r));ix++){
        const coverage=Math.max(0,1-Math.hypot(ix-cx,iz-cz)/r);
        const at=iz*resolution+ix,value=Math.round(coverage*strength*230);
        if(value>pixels[at])pixels[at]=value;
      }
  };
  for(const path of paths)for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/(pixel*.35)));
    for(let j=0;j<=steps;j++){const t=j/steps;brush(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,(a.strength??1)+((b.strength??1)-(a.strength??1))*t);}
  }
  return pixels;
}
