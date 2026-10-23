// QA specialization only: retain every material operation, expose the immutable biome to GLSL.
export function specializeMangroveGroundSource(source){
 const anchor='    material.customProgramCacheKey=()=>cache()';
 if(source.split(anchor).length!==2)throw Error('Ground specialization anchor changed');
 return source.replace(anchor,`    if(material.userData.toonGround&&material.userData.groundBiome==='mangrove'){
      const previous=material.onBeforeCompile;
      material.onBeforeCompile=(shader,renderer)=>{previous(shader,renderer);
        const token=',uBiome,uGroundDetail';if(shader.fragmentShader.split(token).length!==2)throw Error('Biome declaration changed');
        shader.fragmentShader='const float uBiome=2.;'+shader.fragmentShader.replace(token,',uGroundDetail');
      };
    }
`+anchor);
}
