// QA only: share area-weighted face normals at coincident horizon vertices.
// Positions, colours, indices and triangle counts remain untouched.
export function smoothHorizonNormalsNumeric(geometry){
 const started=performance.now(),p=geometry.attributes.position,n=geometry.attributes.normal;
 let minX=Infinity,minZ=Infinity,maxZ=-Infinity;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i);
  if(!Number.isInteger(x)||!Number.isInteger(z))throw Error('QA numeric normal keys require integer lattice');
  minX=Math.min(minX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
 }
 const stride=maxZ-minZ+1,sums=new Map(),keys=new Float64Array(p.count);
 for(let i=0;i<p.count;i+=3){
  const ax=p.getX(i+1)-p.getX(i),ay=p.getY(i+1)-p.getY(i),az=p.getZ(i+1)-p.getZ(i);
  const bx=p.getX(i+2)-p.getX(i),by=p.getY(i+2)-p.getY(i),bz=p.getZ(i+2)-p.getZ(i);
  const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;
  for(let j=i;j<i+3;j++){
   const key=(p.getX(j)-minX)*stride+p.getZ(j)-minZ;keys[j]=key;
   const sum=sums.get(key)??[0,0,0,p.getY(j)];if(sum[3]!==p.getY(j))throw Error('Multiple heights at shared XZ');sum[0]+=nx;sum[1]+=ny;sum[2]+=nz;sums.set(key,sum);
  }
 }
 for(let i=0;i<p.count;i++){const a=sums.get(keys[i]),len=Math.hypot(a[0],a[1],a[2])||1;n.setXYZ(i,a[0]/len,a[1]/len,a[2]/len);}
 n.needsUpdate=true;
 geometry.userData.qaNormalBuild={ms:performance.now()-started,vertices:p.count,unique:sums.size};
}
