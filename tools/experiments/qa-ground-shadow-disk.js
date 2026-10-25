// QA-only: wider irregular nine-tap receiver filter, same map and sample count.
export function applyMaterialStudy(world){
 if(!['sabana','gran-rio','gran-canon'].includes(world.state.biome))return {control:true};
 const seen=new WeakSet(),points=[[0,0],[-.326,-.406],[-.840,-.074],[-.696,.457],[-.203,.621],[.962,-.195],[.473,-.480],[.519,.767],[.185,-.893]];
 const patch=material=>{
  if(!material?.userData.toonGround||seen.has(material))return;
  seen.add(material);const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile.call(material,shader,renderer);let index=0;
   shader.fragmentShader=shader.fragmentShader.replace(/vec2 o=vec2\(float\(-?\d\),float\(-?\d\)\)\*uNativeShadowTexel\*1\.15;/g,()=>{const p=points[index++];return `vec2 o=vec2(${p[0].toFixed(6)},${p[1].toFixed(6)})*uNativeShadowTexel*3.0;`;});
   if(index!==9)throw Error('Expected nine native shadow taps, got '+index);
  };
  material.customProgramCacheKey=()=>cache()+'|qa-ground-shadow-disk';material.needsUpdate=true;
 };
 world.scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])patch(m)});
 const register=world.toon.material;world.toon.material=function(material){const result=register.call(this,material);patch(material);return result;};
 return {shadowSamples:9,radiusTexels:3,newTextures:0,newGeometry:0};
}
