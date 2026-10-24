import {groundLightingFunctions} from '../../src/rendering/ground-lighting-source.js';
const qaBrdf=groundLightingFunctions.slice(groundLightingFunctions.indexOf('vec3 brdf4'),groundLightingFunctions.indexOf('float nativeContact4')).replaceAll('brdf4','qaBaseBrdf').replaceAll('PI4','3.14159265359').replace('fresnel4(max(dot(H,V),0.),mix(vec3(.04),base,metal))','(mix(vec3(.04),base,metal)+(1.-mix(vec3(.04),base,metal))*pow(1.-max(dot(H,V),0.),5.))');
// QA only: world-projected ground texture and optional continuous light on native grass bases.
export function applyMaterialStudy(world,variant='original'){
 if(world.pack.biomeId!=='savanna')throw Error('Savanna-only material study');
 if(!world.qaRootBase){
  const materials=[...new Set(world.prototypes[8].map(p=>p.material))];
  for(const m of materials){
   const compile=m.onBeforeCompile,cache=m.customProgramCacheKey.bind(m);
   m.onBeforeCompile=(shader,renderer)=>{
    compile.call(m,shader,renderer);if(!m.userData.qaRootBase)return;
    const ground=world.terrainMeshes.find(mesh=>mesh.material.userData.biomeGround)?.material.userData.biomeGround;
    if(!ground)throw Error('Ground uniforms unavailable');
    shader.uniforms.qaBaseARH=ground.uGroundARH;shader.uniforms.qaBaseMap=ground.uGroundDetailMap;shader.uniforms.qaBaseParams=ground.uGroundParams;shader.uniforms.qaBaseSeed=ground.uGroundSeed;
    shader.fragmentShader='uniform sampler2D qaBaseMap,qaBaseARH;uniform vec4 qaBaseParams;uniform vec2 qaBaseSeed;\n'+shader.fragmentShader;
    const anchor='bool ground=uSurfaceType<.5;';
    if(shader.fragmentShader.split(anchor).length!==2)throw Error('Native lighting anchor changed');
    shader.fragmentShader=shader.fragmentShader.replace(anchor,`
     float qaRoot=1.-smoothstep(.035,.16,(vNativeHeight-uNativeMinY)/max(uNativeSizeY,.05));
     float qaUp=smoothstep(.35,.85,normalize(geometricNormal).y);
     float qaMask=qaRoot*qaUp*(1.-clamp(leaf,0.,1.));
     vec2 qaUV=mat2(.8,-.6,.6,.8)*vToonWorld.xz*qaBaseParams.x+qaBaseSeed+mod(mat2(.8,-.6,.6,.8)*uWorldOrigin*qaBaseParams.x,1.);
     vec2 qaDx=dFdx(qaUV),qaDy=dFdy(qaUV);
     if(qaMask>.001){vec3 qaTile=textureGrad(qaBaseMap,qaUV,qaDx,qaDy).rgb*vec3(1.14,1.09,.97);baseColor=mix(baseColor,qaTile,qaMask);}
    `+anchor);
    if(m.userData.qaRootBase==='root'){shader.fragmentShader=shader.fragmentShader.replace('float qaMask=qaRoot*qaUp*(1.-clamp(leaf,0.,1.));',`float qaLocalH=vNativeHeight-uNativeMinY;float qaMask=1.-smoothstep(.025,.055,qaLocalH);`);}
    if(['continuous','root'].includes(m.userData.qaRootBase)){
     Object.assign(shader.uniforms,world.contacts.uniforms);
     shader.fragmentShader='uniform sampler2D uContactMap;uniform vec4 uContactBounds;uniform float uContactOn;\n'+shader.fragmentShader;
     const end='return clamp(result,0.,1.);';if(shader.fragmentShader.split(end).length!==2)throw Error('Lighting output anchor changed');
     shader.fragmentShader=qaBrdf+'\n'+shader.fragmentShader;
     shader.fragmentShader=shader.fragmentShader.replace(end,`
      if(qaMask>.001){
       vec3 qaBase=textureGrad(qaBaseMap,qaUV,qaDx,qaDy).rgb*vec3(1.14,1.09,.97);
       vec3 qaARH=textureGrad(qaBaseARH,qaUV,qaDx,qaDy).rgb;
       float qaAO=mix(.45,1.,qaARH.r);vec3 qaN=normalize(geometricNormal),qaAlbedo=toLinear4(clamp(qaBase,0.,1.));
       vec3 qaSun=mix(vec3(3.65,3.30,2.78),vec3(.22,.36,.66)*uNightLight,uNight);
       vec3 qaAmbient=mix(vec3(.55,.63,.67),vec3(.095,.17,.32)*uNightLight,uNight);
       float qaVisibility=1.-nativeShadowOcclusion(qaN,vToonWorld)*.93;
       qaAmbient=mix(qaAmbient,vec3(.17,.28,.34),smoothstep(0.,1.,clamp((1.-qaVisibility)/.93,0.,1.))*(1.-uNight));
       vec2 qaContactUV=(vToonWorld.xz-uContactBounds.xy)/max(uContactBounds.zw,vec2(1.));
       float qaContact=1.;if(uContactOn>.5&&all(greaterThanEqual(qaContactUV,vec2(0.)))&&all(lessThanEqual(qaContactUV,vec2(1.))))qaContact=texture(uContactMap,qaContactUV).r;
       vec3 qaLit=qaBaseBrdf(qaN,view,uLightDir,qaAlbedo,.92,0.)*qaSun*qaVisibility*mix(.48,1.,qaAO)+qaAlbedo*qaAmbient*qaAO*qaContact*(.76+.24*clamp(qaN.y,0.,1.));
       result=mix(result,filmic4(qaLit),qaMask);
      }
     `+end);
    }
   };
   m.customProgramCacheKey=()=>cache()+'|qa-root-base-v1-'+m.userData.qaRootBase;
  }
  world.qaRootBase=materials;
 }
 for(const m of world.qaRootBase){const enabled=['continuous','root'].includes(variant)?variant:false;if(m.userData.qaRootBase!==enabled){m.userData.qaRootBase=enabled;m.needsUpdate=true;}}
 return {variant,slot:8,materials:world.qaRootBase.length,additionalMaterialSamplesMax:['continuous','root'].includes(variant)?4:1,additionalShadowQuery:['continuous','root'].includes(variant),additionalTextures:0,additionalDraws:0,additionalGeometry:0};
}
