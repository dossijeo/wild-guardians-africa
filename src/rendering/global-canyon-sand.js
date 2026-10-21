// Explicit laboratory option; uses existing CC0 Aerial Beach 01 normal map.
export function canyonSandEnabled(search=globalThis.location?.search??''){
 const q=new URLSearchParams(search);return q.get('visualLab')==='global-lighting'&&['1','full'].includes(q.get('canyonSand'));
}
export function canyonSandFull(search=globalThis.location?.search??''){return canyonSandEnabled(search)&&new URLSearchParams(search).get('canyonSand')==='full';}
export function patchCanyonSand(source,full=false){
 const edits=[
 ['void groundMaterial417(', 'uniform sampler2D uCanyonSandNormal;float canyonSandWeight=0.;void groundMaterial417('],
 ['materialAO410=mix(1.,mix(.45,1.,arh.r),amount);',`materialAO410=mix(1.,mix(.45,1.,arh.r),amount);if(canyon){
   vec3 wp=worldPatternPosition(worldP);
   float deposit=smoothstep(.32,.62,materialNoise(vec3(wp.x*.10,0.,wp.z*.10))*.75+materialNoise(vec3(wp.x*.27,0.,wp.z*.27))*.25)*canyonFlat;
   vec2 suv=mat2(.8,-.6,.6,.8)*worldP.xz/30.+uGroundSeed+mod(mat2(.8,-.6,.6,.8)*uWorldOrigin/30.,1.);
   vec2 sdx=dFdx(suv),sdy=dFdy(suv);
   vec3 sand=vec3(0.56913064,0.52422576,0.47915630)*vec3(1.,.83,.59);
   vec3 sn=textureGrad(uCanyonSandNormal,suv,sdx,sdy).rgb*2.-1.;
   canyonSandWeight=deposit*.9;color=mix(color,sand,deposit*.9);
   N=normalize(mix(N,sampleTurfN410(Ng,sn,.65*normalFade),deposit*.9));
   rough=mix(rough,.98,deposit);
   materialAO410=mix(materialAO410,1.,deposit*.9);
  }`],
 ['float biomeAO=nativeContact4(vToonWorld)*materialAO410;','biomeSpec*=mix(1.,(.02*.02)/(1.-.98*.72),canyonSandWeight);float biomeAO=nativeContact4(vToonWorld)*materialAO410;']
 ];
 for(const [from,to] of edits){if(!source.includes(from))throw Error('Canyon sand anchor missing: '+from);source=source.replace(from,to);}
 if(full)source=source.replace('uniform sampler2D uCanyonSandNormal;', 'uniform sampler2D uCanyonSandNormal,uCanyonSandBase;').replace('vec3 sand=vec3(0.56913064,0.52422576,0.47915630)', 'vec3 sand=textureGrad(uCanyonSandBase,suv,sdx,sdy).rgb');
 return source;
}
