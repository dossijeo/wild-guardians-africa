export function containsPoint(polygon,x,z) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
  }
  return inside;
}
export function edgeDistance(a,b,x,z) {
  const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
  const t=length?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/length)):0;
  return Math.hypot(x-a.x-dx*t,z-a.z-dz*t);
}
export function footprintDistance(polygon,x,z) {
  if(containsPoint(polygon,x,z))return 0;
  let best=Infinity;
  for(let i=0;i<polygon.length;i++)best=Math.min(best,edgeDistance(polygon[i],polygon[(i+1)%polygon.length],x,z));
  return best;
}
export function footprintsOverlap(a,b) {
  if(a.some(p=>footprintDistance(b,p.x,p.z)<1e-8)||b.some(p=>footprintDistance(a,p.x,p.z)<1e-8))return true;
  const side=(a,b,p)=>(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++) {
    const p=a[i],q=a[(i+1)%a.length],r=b[j],s=b[(j+1)%b.length];
    if(side(p,q,r)*side(p,q,s)<0&&side(r,s,p)*side(r,s,q)<0)return true;
  }
  return false;
}
