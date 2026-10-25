// Sample the same resident RGBA mask and texel centres as groundMaterial419.
// This works for both JS fixture masks and native C++ campaign payloads.
export function residentWearSampler(world,cx,cz){
 const material=world.chunks.get(cx+','+cz)?.children.find(o=>o.userData.ground)?.material;
 const image=material?.userData.biomeGround?.uGroundMask.value.image;
 if(!image?.data||image.width!==35||image.height!==35)throw Error('Resident ground mask missing');
 const {data,width,height}=image,minX=cx*48-24,minZ=cz*48-24;
 return (x,z)=>{
  const fx=Math.max(0,Math.min(width-1,(x-minX)/1.5+1)),fz=Math.max(0,Math.min(height-1,(z-minZ)/1.5+1));
  const ix=Math.floor(fx),iz=Math.floor(fz),jx=Math.min(ix+1,width-1),jz=Math.min(iz+1,height-1),tx=fx-ix,tz=fz-iz;
  const at=(a,b)=>data[(b*width+a)*4+3]/255;
  return (at(ix,iz)*(1-tx)+at(jx,iz)*tx)*(1-tz)+(at(ix,jz)*(1-tx)+at(jx,jz)*tx)*tz;
 };
}
