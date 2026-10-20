// QA-only: broad, origin-stable ground palette variation; fine material intact.
export function applyMaterialStudy(world){
 if(!['sabana','gran-rio','gran-canon'].includes(world.state.biome))return {control:true};
 const seen=new WeakSet();
 const patch=material=>{
  if(!material?.userData.toonGround||seen.has(material))return;
  seen.add(material);const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile.call(material,shader,renderer);
   const anchor='color=clamp(mix(original,tex,amount),0.,1.);';
   if(!shader.fragmentShader.includes(anchor))throw Error('Ground palette anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,`
    vec3 broadP=worldPatternPosition(worldP);
    float broadPatch=materialNoise(vec3(broadP.x*.045+31.7,0.,broadP.z*.045-12.4));
    float middlePatch=materialNoise(vec3(broadP.x*.12-8.3,0.,broadP.z*.12+17.6));
    float patchMix=smoothstep(.30,.70,broadPatch*.75+middlePatch*.25);
    vec3 patchTint=canyon?mix(vec3(.90,.82,.72),vec3(1.06,1.02,.96),patchMix):
       (river?mix(vec3(.88,.96,.82),vec3(1.14,1.03,.85),patchMix):mix(vec3(.88,.94,.78),vec3(1.08,1.02,.91),patchMix));
    tex*=mix(vec3(1.),patchTint,up);
    ${anchor}`);
  };
  material.customProgramCacheKey=()=>cache()+'|qa-ground-palette-patches';material.needsUpdate=true;
 };
 world.scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])patch(m)});
 const register=world.toon.material;world.toon.material=function(material){const result=register.call(this,material);patch(material);return result;};
 return {newTextures:0,newGeometry:0,scope:'Ground albedo; broad noise at 22m and 8m, original fine material unchanged'};
}
