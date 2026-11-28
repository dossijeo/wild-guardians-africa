// Shared deterministic interpolation of confirmed 49×49 terrain and 35×35 ground masks.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function sampleGrassTerrain(c,x,z){const lx=clamp(x-(c.cx*48-24),0,47.99999),lz=clamp(z-(c.cz*48-24),0,47.99999),ix=Math.floor(lx),iz=Math.floor(lz),fx=lx-ix,fz=lz-iz;
 const a=c.h[iz*49+ix],b=c.h[iz*49+ix+1],d=c.h[(iz+1)*49+ix],e=c.h[(iz+1)*49+ix+1];let y,sx,sz;if(fx+fz<=1){sx=b-a;sz=d-a;y=a+fx*sx+fz*sz}else{sx=e-d;sz=e-b;y=e-(1-fx)*sx-(1-fz)*sz}
 const mx=clamp(lx/1.5+1,0,33.9999),mz=clamp(lz/1.5+1,0,33.9999),gx=Math.floor(mx),gz=Math.floor(mz),tx=mx-gx,tz=mz-gz,ctx=[];
 for(let k=0;k<4;k++){const at=(xx,zz)=>c.mask.data[(zz*35+xx)*4+k]/255;ctx.push((at(gx,gz)*(1-tx)+at(gx+1,gz)*tx)*(1-tz)+(at(gx,gz+1)*(1-tx)+at(gx+1,gz+1)*tx)*tz)}return {y,sx,sz,ctx};}
// Read a confirmed native chunk without changing or retaining WASM memory.
export function grassChunkFromConfirmedPayload(payload){
 const positions=payload?.terrain?.positions,mask=payload?.groundMask;
 if(payload?.authority!=='spatial-wasm'||!Number.isSafeInteger(payload.cx)||!Number.isSafeInteger(payload.cz)||!(positions instanceof Float32Array)||positions.length!==49*49*3||!(mask instanceof Uint8Array)||mask.length!==35*35*4)throw TypeError('Invalid confirmed grass terrain');
 const h=new Float32Array(49*49);
 for(let i=0;i<h.length;i++){const y=positions[i*3+1];if(!Number.isFinite(y))throw TypeError('Invalid confirmed grass height');h[i]=y;}
 return {cx:payload.cx,cz:payload.cz,h,mask:{data:mask}};
}
