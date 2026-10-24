// QA only: share area-weighted face normals at coincident horizon vertices.
// Positions, colours, indices and triangle counts remain untouched.
export function smoothHorizonNormals(geometry){
 const started=performance.now(),p=geometry.attributes.position,n=geometry.attributes.normal;
 const sums=new Map(),keys=new Array(p.count);
 for(let i=0;i<p.count;i+=3){
  const ax=p.getX(i+1)-p.getX(i),ay=p.getY(i+1)-p.getY(i),az=p.getZ(i+1)-p.getZ(i);
  const bx=p.getX(i+2)-p.getX(i),by=p.getY(i+2)-p.getY(i),bz=p.getZ(i+2)-p.getZ(i);
  const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;
  for(let j=i;j<i+3;j++){
   const key=`${p.getX(j)},${p.getY(j)},${p.getZ(j)}`;keys[j]=key;
   const sum=sums.get(key)??[0,0,0];sum[0]+=nx;sum[1]+=ny;sum[2]+=nz;sums.set(key,sum);
  }
 }
 for(let i=0;i<p.count;i++){const a=sums.get(keys[i]),len=Math.hypot(...a)||1;n.setXYZ(i,a[0]/len,a[1]/len,a[2]/len);}
 n.needsUpdate=true;
 geometry.userData.qaNormalBuild={ms:performance.now()-started,vertices:p.count,unique:sums.size};
}
