import {AWAKENINGS as A} from '../simulation/awakening-config.js';
export const ROOT_VISUAL_RADIUS=4.25;
function hash(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967296;}
export function awakeningRootPaths(source,plants){
  const wall=source.kind==='wall';
  const neighbors=plants.filter(p=>p.alive&&!p.blessing&&Math.hypot(p.x-source.x,p.z-source.z)<=A.radius+1e-9)
    .sort((a,b)=>Math.hypot(a.x-source.x,a.z-source.z)-Math.hypot(b.x-source.x,b.z-source.z)||a.id.localeCompare(b.id)).slice(0,6);
  const paths=[];
  const ring=(p,r,strength)=>paths.push(Array.from({length:97},(_,i)=>{const a=i/96*Math.PI*2,rr=r*(1+.035*Math.sin(a*5+hash(p.id)*6));return {x:p.x+Math.cos(a)*rr,z:p.z+Math.sin(a)*rr,strength};}));
  if(!wall){ring(source,.61,1);for(const p of neighbors)ring(p,.60,.85);}
  for(const target of wall?[]:neighbors){
    const dx=target.x-source.x,dz=target.z-source.z,length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length,phase=hash(source.id+target.id)*6.28;
    paths.push(Array.from({length:33},(_,i)=>{const t=i/32,d=.43+(length-.86)*t,bend=Math.sin(t*Math.PI)*Math.sin(t*8+phase)*.12;return {x:source.x+dx/length*d+nx*bend,z:source.z+dz/length*d+nz*bend,strength:.92-.2*t};}));
  }
  // Fine decorative tendrils remain local; recipient rings only mark real beneficiaries.
  for(let branch=0;branch<(wall?10:12);branch++){
    const a=hash(source.id)*6.28+branch*Math.PI*2/(wall?10:12)+(hash('angle'+source.id+branch)-.5)*.32,length=(wall||neighbors.length?2.8:1.6)+hash(source.id+branch)*(wall||neighbors.length?1.3:1.1),phase=hash('curl'+branch+source.id)*6.28;
    const points=Array.from({length:41},(_,i)=>{const t=i/40,d=.44+(length-.44)*t,angle=a+Math.sin(t*6+phase)*.16*t;return {x:source.x+Math.cos(angle)*d,z:source.z+Math.sin(angle)*d,strength:(.85-.55*t)*Math.min(1,(1-t)*7)};});
    paths.push(points);
    for(const j of [16,27]){const p=points[j],side=hash(source.id+branch+j)>.5?1:-1;
      paths.push(Array.from({length:13},(_,i)=>{const t=i/12,d=t*(j===16?.65:.4),angle=a+side*(.65+t*.55);return {x:p.x+Math.cos(angle)*d,z:p.z+Math.sin(angle)*d,strength:p.strength*(1-t)*.65};}));}
  }
  return paths;
}
export function rasterizeAwakeningRoots(paths,bounds,resolution=1024,stroke=.005){
 if(!Number.isSafeInteger(resolution)||resolution<16||resolution>1024)throw RangeError('Invalid root-mask resolution');
 // Rasterize distance to each segment once, instead of stamping overlapping brushes.
 const pixels=new Uint8Array(resolution*resolution),pixel=bounds.size/resolution,r=stroke/pixel+.55;
 for(const path of paths)for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],ax=(a.x-bounds.minX)/pixel-.5,ay=(a.z-bounds.minZ)/pixel-.5,bx=(b.x-bounds.minX)/pixel-.5,by=(b.z-bounds.minZ)/pixel-.5,dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy;
  const x0=Math.max(0,Math.floor(Math.min(ax,bx)-r)),x1=Math.min(resolution-1,Math.ceil(Math.max(ax,bx)+r)),y0=Math.max(0,Math.floor(Math.min(ay,by)-r)),y1=Math.min(resolution-1,Math.ceil(Math.max(ay,by)+r));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const t=len?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/len)):0,vx=x-ax-t*dx,vy=y-ay-t*dy,dist=vx*vx+vy*vy; if(dist>=r*r)continue;const coverage=1-Math.sqrt(dist)/r,strength=(a.strength??1)+((b.strength??1)-(a.strength??1))*t;
   const at=y*resolution+x,value=Math.round(Math.sqrt(coverage*strength)*255);if(value>pixels[at])pixels[at]=value;
  }
 }
 return pixels;
}
