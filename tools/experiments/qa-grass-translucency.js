import {applyMaterialStudy as placeGrass} from './qa-grass-biomes.js';
// QA: patch the actual illustrated lighting, retaining native shadow coverage.
export async function applyMaterialStudy(world,variant='original'){
 if(!world.qaGrassTransmission){
  const audit=await placeGrass(world),m=world.groundDetails.material;
  const compile=m.onBeforeCompile,cache=m.customProgramCacheKey.bind(m);
  m.onBeforeCompile=(shader,renderer)=>{
   compile.call(m,shader,renderer);if(!m.userData.qaTransmission)return;
   const anchor='vec3 lit=toLinear4(clamp(base,0.,1.))*illumination*contact;';
   if(shader.fragmentShader.split(anchor).length!==2)throw Error('Expected exactly one active artLighting416 anchor');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,`
    float qaLeafBack=max(-dot(normalize(geometricNormal),uLightDir),0.);
    float qaLeafView=pow(max(dot(view,-uLightDir),0.),2.);
    float qaLeafThin=smoothstep(.05,.45,vRelativeHeight);
    illumination+=uArtSun*.32*qaLeafBack*(.35+.65*qaLeafView)*qaLeafThin*(1.-clamp(shadowCoverage,0.,1.))*(1.-uNight);
   `+anchor);
  };
  m.customProgramCacheKey=()=>cache()+'|qa-leaf-transmission-v2-'+!!m.userData.qaTransmission;
  world.qaGrassTransmission={audit};
 }
 const m=world.groundDetails.material,enabled=variant==='translucent';
 if(m.userData.qaTransmission!==enabled){m.userData.qaTransmission=enabled;m.needsUpdate=true;}
 return {variant,...world.qaGrassTransmission.audit,enabled,strength:.32,additionalTextures:0,additionalGeometry:0,scope:'Illustrated directional backlight, native shadow coverage, root attenuation, zero at night'};
}
