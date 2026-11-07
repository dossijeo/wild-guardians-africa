// Shared deterministic interpolation of confirmed 49×49 terrain and 35×35 ground masks.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function sampleGrassTerrain(c,x,z){const lx=clamp(x-(c.cx*48-24),0,47.99999),lz=clamp(z-(c.cz*48-24),0,47.99999),ix=Math.floor(lx),iz=Math.floor(lz),fx=lx-ix,fz=lz-iz;
 const a=c.h[iz*49+ix],b=c.h[iz*49+ix+1],d=c.h[(iz+1)*49+ix],e=c.h[(iz+1)*49+ix+1];let y,sx,sz;if(fx+fz<=1){sx=b-a;sz=d-a;y=a+fx*sx+fz*sz}else{sx=e-d;sz=e-b;y=e-(1-fx)*sx-(1-fz)*sz}
 const mx=clamp(lx/1.5+1,0,33.9999),mz=clamp(lz/1.5+1,0,33.9999),gx=Math.floor(mx),gz=Math.floor(mz),tx=mx-gx,tz=mz-gz,ctx=[];
 for(let k=0;k<4;k++){const at=(xx,zz)=>c.mask.data[(zz*35+xx)*4+k]/255;ctx.push((at(gx,gz)*(1-tx)+at(gx+1,gz)*tx)*(1-tz)+(at(gx,gz+1)*(1-tx)+at(gx+1,gz+1)*tx)*tz)}return {y,sx,sz,ctx};}
