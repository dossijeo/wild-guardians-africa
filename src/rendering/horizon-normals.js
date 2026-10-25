// Worker-local scratch is reused between horizon jobs; no GPU allocations.
let lookup=new Int32Array(0),ids=new Uint32Array(0),representatives=new Uint32Array(0),sums=new Float64Array(0);
export function smoothHorizonNormals(data){
 if(!(data instanceof Float32Array)||data.length%27)throw TypeError('Invalid horizon triangle buffer');
 const started=performance.now(),count=data.length/9;
 if(!count)return {ms:0,vertices:0,unique:0,scratchBytes:0};
 let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity;
 for(let i=0;i<data.length;i+=9){
  const x=data[i],z=data[i+2];
  if(!Number.isInteger(x)||!Number.isInteger(z))throw Error('Horizon normals require integer lattice');
  minX=Math.min(minX,x);minZ=Math.min(minZ,z);maxX=Math.max(maxX,x);maxZ=Math.max(maxZ,z);
 }
 const stride=maxZ-minZ+1,size=(maxX-minX+1)*stride;
 if(!Number.isSafeInteger(size)||size>2000000)throw Error('Horizon normal lattice exceeds scratch limit');
 if(lookup.length<size)lookup=new Int32Array(size);else lookup.fill(0,0,size);
 if(ids.length<count){ids=new Uint32Array(count);representatives=new Uint32Array(count);}
 let unique=0;
 for(let i=0;i<count;i++){
  const j=i*9,key=(data[j]-minX)*stride+data[j+2]-minZ;
  let id=lookup[key]-1;
  if(id<0){id=unique++;lookup[key]=id+1;representatives[id]=j;}
  else if(data[representatives[id]+1]!==data[j+1])throw Error('Multiple horizon heights at shared XZ');
  ids[i]=id;
 }
 if(sums.length<unique*3)sums=new Float64Array(unique*3);else sums.fill(0,0,unique*3);
 for(let i=0;i<data.length;i+=27){
  const ax=data[i+9]-data[i],ay=data[i+10]-data[i+1],az=data[i+11]-data[i+2];
  const bx=data[i+18]-data[i],by=data[i+19]-data[i+1],bz=data[i+20]-data[i+2];
  const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;
  for(let j=i/9;j<i/9+3;j++){const k=ids[j]*3;sums[k]+=nx;sums[k+1]+=ny;sums[k+2]+=nz;}
 }
 for(let k=0;k<unique*3;k+=3){const len=Math.hypot(sums[k],sums[k+1],sums[k+2])||1;sums[k]/=len;sums[k+1]/=len;sums[k+2]/=len;}
 for(let i=0;i<count;i++){const k=ids[i]*3;data[i*9+3]=sums[k];data[i*9+4]=sums[k+1];data[i*9+5]=sums[k+2];}
 return {ms:performance.now()-started,vertices:count,unique,scratchBytes:lookup.byteLength+ids.byteLength+representatives.byteLength+sums.byteLength};
}
