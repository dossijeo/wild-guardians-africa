// Match the existing impostor shader's density and terminal fade in CPU.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export function qaFarDensity(current,camera,id){
 const p=current.prototype,u=p.uniforms,g=p.impostors.geometry;
 if(!current.qaRankById)current.qaRankById=new Map(current.trees.map((t,i)=>[t.id,g.attributes.aTreeRank.getX(i)]));
 const t=current.treeById.get(id);if(!t)return 0;
 const d=Math.hypot(camera.x+u.uFarOrigin.value.x-t.x,camera.z+u.uFarOrigin.value.y-t.z),r=u.uDensityRange.value,f=u.uDistanceFadeRange.value;
 const density=1-(1-u.uDensityMinimum.value)*smooth(r.x,r.y,d),band=u.uDensityBand.value,weight=clamp((density+band-current.qaRankById.get(id))/band);
 return (1+(weight-1)*u.uDensityEnabled.value)*(1-smooth(f.x,f.y,d));
}
