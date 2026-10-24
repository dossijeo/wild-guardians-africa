// Area-weighted normals for the single-height integer horizon lattice.
// Runs during worker generation; only the existing normal slots are modified.
export function smoothHorizonNormals(data){
 if(!(data instanceof Float32Array)||data.length%27)throw TypeError('Invalid horizon triangle buffer');
 const started=performance.now(),count=data.length/9;
 let minX=Infinity,minZ=Infinity,maxZ=-Infinity;
 for(let i=0;i<data.length;i+=9){
  const x=data[i],z=data[i+2];
  if(!Number.isInteger(x)||!Number.isInteger(z))throw Error('Horizon normals require integer lattice');
  minX=Math.min(minX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
 }
 const stride=maxZ-minZ+1,sums=new Map(),keys=new Float64Array(count);
 for(let i=0;i<data.length;i+=27){
  const ax=data[i+9]-data[i],ay=data[i+10]-data[i+1],az=data[i+11]-data[i+2];
  const bx=data[i+18]-data[i],by=data[i+19]-data[i+1],bz=data[i+20]-data[i+2];
  const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;
  for(let j=i;j<i+27;j+=9){
   const key=(data[j]-minX)*stride+data[j+2]-minZ;keys[j/9]=key;
   if(!Number.isSafeInteger(key))throw Error('Horizon coordinate range exceeds exact keys');
   const sum=sums.get(key)??[0,0,0,data[j+1]];
   if(sum[3]!==data[j+1])throw Error('Multiple horizon heights at shared XZ');
   sum[0]+=nx;sum[1]+=ny;sum[2]+=nz;sums.set(key,sum);
  }
 }
 for(let i=0;i<count;i++){
  const a=sums.get(keys[i]),len=Math.hypot(a[0],a[1],a[2])||1;
  data[i*9+3]=a[0]/len;data[i*9+4]=a[1]/len;data[i*9+5]=a[2]/len;
 }
 return {ms:performance.now()-started,vertices:count,unique:sums.size};
}
