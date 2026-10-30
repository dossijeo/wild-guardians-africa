// Conservative world bounds from the same authored bounds and instance transform
// used by Wild Engine. Includes passable foliage: it can still hide the spirit.
export function guardianPropBounds(prop,asset,ground=0){
 if(!asset?.min||!asset?.max)return null;
 const sx=prop.sx??prop.scale??1,sy=prop.sy??prop.scale??1,sz=prop.sz??prop.scale??1;
 const c=Math.cos(prop.yaw??0),s=Math.sin(prop.yaw??0),y=prop.y??ground;
 const min=[Infinity,y+Math.min(asset.min[1]*sy,asset.max[1]*sy),Infinity],max=[-Infinity,y+Math.max(asset.min[1]*sy,asset.max[1]*sy),-Infinity];
 if(max[1]-min[1]<.6)return null;
 for(const x of [asset.min[0]*sx,asset.max[0]*sx])for(const z of [asset.min[2]*sz,asset.max[2]*sz]){
  const wx=prop.x+c*x+s*z,wz=prop.z-s*x+c*z;
  min[0]=Math.min(min[0],wx);min[2]=Math.min(min[2],wz);max[0]=Math.max(max[0],wx);max[2]=Math.max(max[2],wz);
 }
 return {min,max};
}
