import * as THREE from 'three';
// QA-only authored leaf relief; no vertex displacement or extra scene geometry.
export async function applyMaterialStudy(world){
 const texture=await world.assets.texture('/assets/visual-lab/foliage-detail-normal.png',false);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.needsUpdate=true;
 const seen=new WeakSet();
 const patch=material=>{
  if(!material?.userData.artBounds||material.userData.nativeSurface?.type!==1||seen.has(material))return;
  seen.add(material);const compile=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   compile.call(material,shader,renderer);shader.uniforms.uQAFoliageDetail={value:texture};
   const from='vec3 N=normalize(lightNormal);';
   if(!shader.fragmentShader.includes(from))throw Error('Foliage detail anchor missing');
   shader.fragmentShader='uniform sampler2D uQAFoliageDetail;\n'+shader.fragmentShader.replace(from,`${from}
    vec3 leafP=worldPatternPosition(vToonWorld);vec3 leafAxis=abs(geometricNormal);
    vec2 leafUV=leafAxis.y>=max(leafAxis.x,leafAxis.z)?leafP.xz:(leafAxis.x>=leafAxis.z?leafP.zy:leafP.xy);
    // Assets loads PNG without Y flip: invert V to retain the Blender bake's tangent orientation.
    vec2 leafSlope=texture2D(uQAFoliageDetail,vec2(leafUV.x,-leafUV.y)*.5).xy*2.-1.;
    vec3 leafDetail=leafAxis.y>=max(leafAxis.x,leafAxis.z)?vec3(leafSlope.x,0.,leafSlope.y):(leafAxis.x>=leafAxis.z?vec3(0.,leafSlope.y,leafSlope.x):vec3(leafSlope,0.));
    leafDetail-=N*dot(N,leafDetail);
    float leafPixel=max(length(dFdx(leafP)),length(dFdy(leafP)));
    N=normalize(N+leafDetail*.30*leafMix*(1.-smoothstep(.08,.24,leafPixel)));
   `);
  };
  material.customProgramCacheKey=()=>cache()+'|qa-foliage-detail-v1';material.needsUpdate=true;
 };
 world.scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])patch(m)});
 const register=world.toon.material;world.toon.material=function(material){const result=register.call(this,material);patch(material);return result;};
 return {newTextures:1,newGeometry:0,scope:'Native foliage pixels',normalStrength:.30,tileMeters:2};
}
