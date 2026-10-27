// QA-only canyon wall material study. Floor maps, geometry and silhouettes unchanged.
export function applyCanyonBedding(world){
 if(world.state.biome!=='gran-canon')return {control:true};
 for(const material of new Set(world.terrainMeshes.map(m=>m.material))){
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile(shader,renderer);
   const anchor='float h=worldP.y-3.28+sin(worldPatternPosition(worldP).z*.024)*.55,phase=mod(h,5.6);';
   if(!shader.fragmentShader.includes(anchor))throw Error('Canyon mapped strata anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,
    'vec3 beddingP=worldPatternPosition(worldP); float beddingWarp=materialNoise(beddingP*vec3(.065,.018,.065)); float h=worldP.y-3.28+sin(beddingP.z*.024)*.55+(beddingWarp-.5)*1.2,phase=mod(h,5.6);')
    .replace('original=mix(original,stone,smoothstep(1.4,4.,h)*.90);','stone=mix(stone,vec3(.77,.43,.25),.24); original=mix(original,stone,smoothstep(1.4,4.,h)*.90);');
   const normal='N=sampleTurfN410(Ng,mapN,uGroundParams.z*uGroundMicro*amount*normalFade);';
   if(!shader.fragmentShader.includes(normal))throw Error('Canyon normal anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(normal,normal+`
    if(canyon){
     vec3 erosionP=worldPatternPosition(worldP);
     float erosion=materialNoise(erosionP*vec3(.52,1.25,.52));
     vec3 dp1=dFdx(worldP),dp2=dFdy(worldP),R1=cross(dp2,Ng),R2=cross(Ng,dp1);
     float det=dot(dp1,R1),wall=(1.-canyonFlat)*smoothstep(1.4,4.,worldP.y-3.28)*normalFade;
     vec3 grad=sign(det)*(dFdx(erosion)*R1+dFdy(erosion)*R2);
     if(abs(det)>.00000001)N=normalize(abs(det)*N-grad*.13*wall);
    }
   `);
  };
  material.customProgramCacheKey=()=>cache()+'|qa-canyon-bedding';material.needsUpdate=true;
 }
 return {newTextures:0,newGeometry:0,scope:'Wall pigment warping and derivative normal; floor maps retained'};
}
export const applyMaterialStudy=applyCanyonBedding;
