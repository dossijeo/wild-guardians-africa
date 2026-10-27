// QA shading only: original moss maps/UVs and independent mud remain unchanged.
export function applyMaterialStudy(world){
 if(world.state.biome!=='manglares')throw Error('Mangroves only');
 const materials=new Set(world.terrainMeshes.map(m=>m.material));
 for(const material of materials){const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
 material.onBeforeCompile=(shader,renderer)=>{compile(shader,renderer);const anchor='rough=clamp(arh.g,.5,.99);wet=0.;materialAO410=mix(.45,1.,arh.r);materialCover410=1.;return;';
 if(!shader.fragmentShader.includes(anchor))throw Error('Pure moss anchor missing');
 shader.fragmentShader=shader.fragmentShader.replace(anchor,`
 vec2 qaMoistUV=((worldP.xz-uGroundRect.xy)/uGroundRect.z+1.5)/uGroundRect.w;
 float qaDamp=smoothstep(.94,.995,texture(uGroundMask,qaMoistUV).b)*uGroundMapped;
 color*=mix(1.,.86,qaDamp);
 rough=mix(clamp(arh.g,.5,.99),.38,qaDamp);wet=.4*qaDamp;
 materialAO410=mix(.45,1.,arh.r);materialCover410=1.;return;
 `);};material.customProgramCacheKey=()=>cache()+'|qa-mangrove-damp-moss';material.needsUpdate=true;}
 return {materials:materials.size,newTextures:0,newGeometry:0,extraMaskSamples:1,scope:'Pure moss shading only; existing moisture mask; no mud mixing'};
}
