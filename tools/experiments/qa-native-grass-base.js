// QA only: remove decorative cyan paint from the dry-grass source material.
export function applyMaterialStudy(world,variant='original'){
 if(world.pack.biomeId!=='savanna')throw Error('Savanna-only material study');
 if(!world.qaDryBase){
  const materials=[...new Set(world.prototypes[8].map(p=>p.material))];
  for(const m of materials){
   const compile=m.onBeforeCompile,cache=m.customProgramCacheKey.bind(m);
   m.onBeforeCompile=(shader,renderer)=>{
    compile.call(m,shader,renderer);if(!m.userData.qaDryBase)return;
    const anchor='bool ground=uSurfaceType<.5;';
    if(shader.fragmentShader.split(anchor).length!==2)throw Error('Native lighting anchor changed');
    shader.fragmentShader=shader.fragmentShader.replace(anchor,`
     float qaCyan=smoothstep(.025,.12,baseColor.b-baseColor.r)*smoothstep(.025,.12,baseColor.g-baseColor.r);
     float qaLuma=dot(baseColor,vec3(.2126,.7152,.0722));
     baseColor=mix(baseColor,vec3(.66,.51,.27)*clamp(qaLuma/.52,.65,1.2),qaCyan);
    `+anchor);
   };
   m.customProgramCacheKey=()=>cache()+'|qa-dry-base-v1-'+!!m.userData.qaDryBase;
  }
  world.qaDryBase=materials;
 }
 for(const m of world.qaDryBase){const enabled=variant==='dry';if(m.userData.qaDryBase!==enabled){m.userData.qaDryBase=enabled;m.needsUpdate=true;}}
 return {variant,slot:8,materials:world.qaDryBase.length,additionalTextures:0,additionalDraws:0,additionalGeometry:0};
}
