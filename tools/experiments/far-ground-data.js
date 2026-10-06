// Height-only proxy for the isolated Sabana experiment. No native chunk buffers,
// water, props or detail textures. Never generated in the gameplay frame loop.
import {groundCellTriangles,groundTriangleWeights} from './far-ground-contacts.js';
export function farGroundData(field,bounds,{step=4,color=[.59,.61,.38],colorAt=null,wash=.25}={}){
 if(!(step>0)||!Number.isFinite(step)||![bounds.minX,bounds.maxX,bounds.minZ,bounds.maxZ].every(Number.isFinite)||bounds.maxX<=bounds.minX||bounds.maxZ<=bounds.minZ)throw Error('Invalid far ground bounds/step');
 const nx=Math.ceil((bounds.maxX-bounds.minX)/step),nz=Math.ceil((bounds.maxZ-bounds.minZ)/step),count=(nx+1)*(nz+1);
 if(count>250000)throw Error('Far ground sample budget exceeded');
 const positions=new Float32Array(count*3),colors=new Float32Array(count*3),indices=new Uint32Array(nx*nz*6);
 for(let z=0;z<=nz;z++)for(let x=0;x<=nx;x++){
  const i=z*(nx+1)+x,px=bounds.minX+(bounds.maxX-bounds.minX)*x/nx,pz=bounds.minZ+(bounds.maxZ-bounds.minZ)*z/nz;
  const washed=(colorAt?colorAt(px,pz):color).map(value=>value*(1-wash)+.65*wash);
  positions.set([px,field.surface(px,pz),pz],i*3);colors.set(washed,i*3);
 }
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
  const i=(z*nx+x)*6,a=z*(nx+1)+x,b=a+1,d=a+nx+1,c=d+1;indices.set([a,d,b,b,d,c],i);
 }
 return {positions,colors,indices,nx,nz,bounds:{...bounds},step};
}
export function farGroundHeight(data,x,z){
 const {bounds,nx,nz,positions}=data;
 if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)return null;
 const fx=(x-bounds.minX)/(bounds.maxX-bounds.minX)*nx,fz=(z-bounds.minZ)/(bounds.maxZ-bounds.minZ)*nz,ix=Math.min(nx-1,Math.floor(fx)),iz=Math.min(nz-1,Math.floor(fz)),u=fx-ix,v=fz-iz,a=iz*(nx+1)+ix;
 if(data.contactCells?.[ix+':'+iz])for(const triangle of groundCellTriangles(data,ix,iz)){const weights=groundTriangleWeights(positions,triangle,x,z);if(weights&&weights.every(w=>w>=-1e-7))return triangle.reduce((sum,index,i)=>sum+positions[index*3+1]*weights[i],0);}
 const h=i=>positions[i*3+1],aa=h(a),b=h(a+1),d=h(a+nx+1);
 return u+v<=1?aa+u*(b-aa)+v*(d-aa):h(a+nx+2)+(1-u)*(d-h(a+nx+2))+(1-v)*(b-h(a+nx+2));
}
