// QA-only: soften quantized terrain lighting without touching albedo or geometry.
export function applyMaterialStudy(world){
 if(world.state.biome!=='desierto')return {control:true};
 const seen=new WeakSet();
 const patch=material=>{
  if(!material?.userData.toonGround||seen.has(material))return;
  seen.add(material);const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile.call(material,shader,renderer);
   const from='float toonRamp4(float x,float levels){x=clamp(x,0.,1.);return floor(x*(levels-.0001))/max(levels-1.,1.);}';
   const to=`float toonRamp4(float x,float levels){
    x=clamp(x,0.,1.);
    if(levels>3.5)return (smoothstep(.13,.37,x)+smoothstep(.38,.62,x)+smoothstep(.63,.87,x))/3.;
    return (smoothstep(.213333,.453333,x)+smoothstep(.546667,.786667,x))*.5;
   }`;
   if(!shader.fragmentShader.includes(from))throw Error('Terrain lighting ramp anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(from,to);
  };
  material.customProgramCacheKey=()=>cache()+'|qa-desert-soft-light';material.needsUpdate=true;
 };
 world.scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])patch(m)});
 const register=world.toon.material;
 world.toon.material=function(material){const result=register.call(this,material);patch(material);return result;};
 return {newTextures:0,newGeometry:0,scope:'Desert terrain and horizon only',transitionWidth:.24};
}
