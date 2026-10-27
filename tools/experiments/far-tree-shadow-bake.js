// Worker-side QA prototype. Rasterize a union, not repeated alpha blending.
// Modifies existing ground RGB only: no resident GPU texture or draw call added.
// Fixed daylight projection is experimental; not a production day/night policy.
export function bakeFarTreeShadows(map,trees,{strength=.3,radius=3,height=6,sun=[-30,55,25],applyRgb=true}={}){
 if(!map||!Number.isFinite(strength)||strength<0||strength>1||!Number.isFinite(radius)||radius<=0||!Number.isFinite(height)||height<0||sun.length!==3||!sun.every(Number.isFinite)||sun[1]<=0)throw Error('Invalid regional shadow bake');
 const {width,height:rows,bounds:b,data}=map,mask=new Uint8Array(width*rows);
 const dx=(b.maxX-b.minX)/(width-1),dz=(b.maxZ-b.minZ)/(rows-1);
 for(const t of trees){
  const sx=Math.abs(t.sx??1),sy=Math.abs(t.sy??1),sz=Math.abs(t.sz??1);
  if(![t.x,t.z,sx,sy,sz].every(Number.isFinite)||!sx||!sz)continue;
  const cx=t.x-height*sy*sun[0]/sun[1],cz=t.z-height*sy*sun[2]/sun[1],rx=radius*sx,rz=radius*sz;
  const x0=Math.max(0,Math.ceil((cx-rx-b.minX)/dx)),x1=Math.min(width-1,Math.floor((cx+rx-b.minX)/dx));
  const z0=Math.max(0,Math.ceil((cz-rz-b.minZ)/dz)),z1=Math.min(rows-1,Math.floor((cz+rz-b.minZ)/dz));
  for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
   const d=((b.minX+x*dx-cx)/rx)**2+((b.minZ+z*dz-cz)/rz)**2;if(d>=1)continue;
   const i=z*width+x,v=Math.round(255*Math.min(1,(1-d)*2));mask[i]=Math.max(mask[i],v);
  }
 }
 let affected=0;
 for(let i=0;i<mask.length;i++){
  if(data[i*4+3]>=128){mask[i]=0;continue;}if(!mask[i])continue; // Keep water mask and RGB untouched.
  const factor=1-strength*mask[i]/255;if(applyRgb)for(let c=0;c<3;c++)data[i*4+c]=Math.round(data[i*4+c]*factor);affected++;
 }
 return {data:mask,width,height:rows,affected,temporaryBytes:mask.byteLength,strength,projection:'fixed-daylight',overlap:'maximum'};
}
