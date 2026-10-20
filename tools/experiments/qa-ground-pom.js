// QA-only Savanna material study. No production imports or geometry changes.
import * as THREE from 'three';
const refined=`
 if(uGroundRelief>.5&&reliefFade>.01&&reliefMask>.01){
  vec3 V=normalize(cameraPosition-worldP);
  vec3 T=normalize(vec3(.8,0.,.6)-Ng*dot(Ng,vec3(.8,0.,.6)));
  vec3 B=normalize(cross(Ng,T));
  float nv=abs(dot(V,Ng));
  float distanceFade=1.-smoothstep(12.,45.,distance(cameraPosition,worldP));
  float grazing=smoothstep(.10,.25,nv);
  float coverage=mix(.58,1.,smoothstep(.15,.64,ctx.r))*(1.-wear*.91);
  vec2 ray=vec2(dot(V,T),-dot(V,B))/max(nv,.20)*uGroundParams.w*uGroundParams.x*reliefFade*reliefMask*distanceFade*grazing*coverage;
  float steps=floor(mix(6.,12.,1.-clamp(nv,0.,1.))*mix(.5,1.,distanceFade)+.5);
  steps=max(4.,steps);
  vec2 start=uv+ray*.45;
  float lo=0.,hi=0.,prev=1.-textureGrad(uGroundARH,start,dx,dy).b;
  float residual=prev;
  for(int k=0;k<12;k++){
   if(float(k)>=steps||residual<=0.)break;
   lo=hi;prev=residual;hi+=1./steps;
   residual=1.-textureGrad(uGroundARH,start-ray*hi,dx,dy).b-hi;
  }
  for(int k=0;k<2;k++){
   float mid=(lo+hi)*.5;
   float r=1.-textureGrad(uGroundARH,start-ray*mid,dx,dy).b-mid;
   if(r>0.){lo=mid;prev=r;}else{hi=mid;residual=r;}
  }
  float hit=mix(lo,hi,clamp(prev/max(prev-residual,.00001),0.,1.));
  uv=start-ray*hit;
 }
`;
function replaceOne(s,a,b){if(!s.includes(a))throw Error('Ground POM QA anchor missing: '+a.slice(0,80));return s.replace(a,b);}
async function texture(path){const t=await new THREE.TextureLoader().loadAsync('/assets/visual-lab/ground-pom/'+path);t.flipY=false;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.anisotropy=8;t.generateMipmaps=true;t.needsUpdate=true;return t;}
export async function applyMaterialStudy(world,variant='A'){
 if(!['A','B','C','D','E','F'].includes(variant))throw Error('Unknown ground study');
 if(world.state.biome!=='sabana')throw Error('Savanna only');
 world.qaGroundPOMResources??=new Map();
 const resources=world.qaGroundPOMResources.get(variant)??[];let [micro,coherentNormal,coherentARH]=resources;
 if(!world.qaGroundPOMResources.has(variant)){
 if(['D','E','F'].includes(variant)){micro=await texture((variant==='F'?'structured':variant==='E'?'coherent':'original')+'-visibility.png');resources.push(micro);}
 if(['E','F'].includes(variant)){coherentNormal=await texture((variant==='F'?'structured':'coherent')+'-normal.png');coherentARH=await texture((variant==='F'?'structured':'coherent')+'-arh.png');resources.push(coherentNormal,coherentARH);}
 world.qaGroundPOMResources.set(variant,resources);
 }
 const touched=[];
 for(const material of new Set(world.terrainMeshes.map(m=>m.material))){
  if(!material.userData.biomeGround||material.userData.groundBiome!=='savanna')continue;
  const compile=material.onBeforeCompile,cache=material.customProgramCacheKey;
  material.onBeforeCompile=(shader,renderer)=>{
   compile.call(material,shader,renderer);
   let s=shader.fragmentShader;
   if(!s.includes('biomeDirect=brdf4')||!s.includes('outgoingLight=toLinear4(filmic4(groundLit))'))throw Error('Original continuous lighting missing');
   if(['C','D','E','F'].includes(variant)){
    const begin=s.indexOf(' if(uGroundRelief>.5&&reliefFade>.01&&reliefMask>.01){'),end=s.indexOf('\n vec3 tex=textureGrad(uGroundDetailMap,uv,dx,dy).rgb;',begin);
    if(begin<0||end<0)throw Error('POM boundaries missing');s=s.slice(0,begin)+refined+s.slice(end);
   }
   if(micro){
    shader.uniforms.uQAMicro={value:micro};s='uniform sampler2D uQAMicro;\nfloat qaSolarVisibility=1.;\n'+s;
    s=replaceOne(s,'materialAO410=mix(1.,mix(.45,1.,arh.r),amount);',`vec2 qaVis=textureGrad(uQAMicro,uv,dx,dy).rg;
    float qaFade=(1.-smoothstep(.025,.12,footprint))*smoothstep(.90,.99,Ng.y);
    materialAO410=mix(1.,qaVis.r,amount*qaFade);
    qaSolarVisibility=mix(1.,qaVis.g,amount*qaFade);`);
    // Replace the old direct AO attenuation, do not multiply it a second time.
    s=replaceOne(s,'biomeDirect*mix(.48,1.,materialAO410)','biomeDirect*mix(qaSolarVisibility,1.,uNight)');
   }
   if(['E','F'].includes(variant)){
    shader.uniforms.uGroundNormal={value:coherentNormal};shader.uniforms.uGroundARH={value:coherentARH};
    s=replaceOne(s,'N=sampleTurfN410(Ng,mapN,uGroundParams.z*uGroundMicro*amount*normalFade);','N=sampleTurfN410(Ng,vec3(mapN.x,-mapN.y,mapN.z),uGroundMicro*amount*normalFade);');
   }
   shader.fragmentShader=s;
  };
  material.customProgramCacheKey=()=>cache.call(material)+'|qa-ground-pom-'+variant;
  material.needsUpdate=true;touched.push({material,compile,cache});
 }
 if(!touched.length)throw Error('No ground materials patched');
 const audit={variant,materials:touched.length,newGeometry:0,newDraws:0,newPasses:0,newTextures:resources.length,continuousOriginal:true};
 world.qaGroundPOM={audit,restore(){for(const {material,compile,cache} of touched){material.dispose();material.onBeforeCompile=compile;material.customProgramCacheKey=cache;material.needsUpdate=true;}/* Resources stay alive across cached-program switches; page teardown owns disposal. */delete world.qaGroundPOM;}};
 return audit;
}
