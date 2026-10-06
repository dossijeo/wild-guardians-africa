import * as THREE from 'three';
import {coverageThreshold} from '../../src/rendering/obstruction-source.js';
import {impostorLightingDeclarations,impostorLightingColor,impostorLightingUniforms,normalAtlasDeclarations,normalAtlasLightingColor} from './far-impostor-lighting.js';
import {modelOrigin,NearTreeSelection,treeDensityRank} from './far-impostor-math.js';
export function createFarImpostorPrototype(source,texture,metadata,trees,{start=40,end=60,toon=null,seed=712,normalAtlas=null,prelitAtlas=null}={}){
 const hasNormals=!!toon&&!!normalAtlas,rotationViews=prelitAtlas?.rotations??1,prelitViews=prelitAtlas?.views??8,prelitResolution=prelitAtlas?.resolution??256;
 const uniforms={uAtlas:{value:texture},uStart:{value:start},uEnd:{value:end},uReady:{value:1},uBlend:{value:1},uDensityEnabled:{value:0},uDensityRange:{value:new THREE.Vector2(100,240)},uDensityMinimum:{value:.15},uDensityBand:{value:.04},uSize:{value:new THREE.Vector2(metadata.impostorWidth,metadata.impostorHeight)},uLighting:{value:new THREE.Color(1,1,1)},...THREE.UniformsUtils.clone(THREE.UniformsLib.fog)};
 if(toon)Object.assign(uniforms,impostorLightingUniforms(toon,source));
 if(hasNormals){normalAtlas.colorSpace=THREE.NoColorSpace;normalAtlas.premultiplyAlpha=true;normalAtlas.generateMipmaps=true;uniforms.uNormalAtlas={value:normalAtlas};uniforms.uNormalAtlasEnabled={value:0};}
 if(prelitAtlas){for(const t of [prelitAtlas.day,prelitAtlas.night]){t.colorSpace=THREE.SRGBColorSpace;t.premultiplyAlpha=true;t.generateMipmaps=true;}uniforms.uPrelitDay={value:prelitAtlas.day};uniforms.uPrelitNight={value:prelitAtlas.night};uniforms.uPrelitEnabled={value:1};uniforms.uRotationBlend={value:1};if(!toon)uniforms.uNight={value:0};}
 const attrs=(geometry,count)=>{for(const [name,size] of [['aTreeBase',3],['aTreeYaw',1],['aTreeScale',3],['aTreeRank',1]])geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(count*size),size));};
 const plane=new THREE.PlaneGeometry(1,1),geometry=new THREE.InstancedBufferGeometry();geometry.index=plane.index;geometry.attributes=plane.attributes;attrs(geometry,trees.length);geometry.instanceCount=trees.length;
 for(const [i,t] of trees.entries()){geometry.attributes.aTreeBase.setXYZ(i,t.x,t.y,t.z);geometry.attributes.aTreeYaw.setX(i,t.yaw);geometry.attributes.aTreeScale.setXYZ(i,t.sx??t.scale,t.sy??t.scale,t.sz??t.scale);geometry.attributes.aTreeRank.setX(i,treeDensityRank(t.id,seed));}
 texture.colorSpace=THREE.SRGBColorSpace;texture.premultiplyAlpha=true;texture.generateMipmaps=true;
 const material=new THREE.ShaderMaterial({uniforms,fog:true,side:THREE.DoubleSide,vertexShader:`attribute vec3 aTreeBase;attribute float aTreeYaw,aTreeRank;attribute vec3 aTreeScale;uniform vec2 uDensityRange;uniform float uDensityEnabled,uDensityMinimum,uDensityBand;uniform vec2 uSize;uniform float uStart,uEnd,uReady;varying vec2 vUv;varying float vView,vMix,vDensityFade;
 ${rotationViews>1?'varying float vPrelitRotation;':''}
 ${hasNormals?'varying vec2 vFarRotation;varying vec3 vFarScale;':''}
 ${toon?'varying vec3 vFarWorld,vFarRight,vFarFacing;varying float vRelativeHeight;':''}
 #include <fog_pars_vertex>
 void main(){vec2 delta=cameraPosition.xz-aTreeBase.xz;float d=length(delta);vec2 dir=d>.0001?delta/d:vec2(0.,1.);vec3 right=vec3(dir.y,0.,-dir.x);float relativeAngle=atan(dir.x,dir.y)-aTreeYaw;vec2 projectedRight=vec2(cos(relativeAngle)*aTreeScale.x,sin(relativeAngle)*aTreeScale.z);float widthScale=length(projectedRight);vec3 world=aTreeBase+right*(uv.x-.5)*uSize.x*widthScale+vec3(0.,uv.y*uSize.y*aTreeScale.y,0.);vUv=uv;${rotationViews>1?'vPrelitRotation=mod(aTreeYaw+6.28318530718,6.28318530718)*8./6.28318530718;':''}${hasNormals?'vFarRotation=vec2(cos(aTreeYaw),sin(aTreeYaw));vFarScale=aTreeScale;':''}float density=1.-(1.-uDensityMinimum)*smoothstep(uDensityRange.x,uDensityRange.y,d);vDensityFade=mix(1.,clamp((density+uDensityBand-aTreeRank)/uDensityBand,0.,1.),uDensityEnabled);${toon?`vFarWorld=world;vFarRight=right;vFarFacing=vec3(dir.x,0.,dir.y);vRelativeHeight=clamp(uv.y*${metadata.impostorHeight}/${metadata.sourceBounds.max[1]-metadata.sourceBounds.min[1]},0.,1.);`:''}float angle=mod(atan(projectedRight.y,projectedRight.x)+6.28318530718,6.28318530718);vView=angle*8./6.28318530718;vMix=1.-uReady*(1.-smoothstep(uStart,uEnd,d));vec4 mvPosition=viewMatrix*vec4(world,1.);gl_Position=projectionMatrix*mvPosition;
 #include <fog_vertex>
 }`,fragmentShader:`uniform sampler2D uAtlas;uniform float uBlend;uniform vec3 uLighting;varying vec2 vUv;varying float vView,vMix,vDensityFade;
 ${coverageThreshold}
 ${prelitAtlas?'uniform sampler2D uPrelitDay,uPrelitNight;uniform float uPrelitEnabled,uRotationBlend;'+(rotationViews>1?'varying float vPrelitRotation;':'')+(!toon?'uniform float uNight;':''):''}
 ${toon?impostorLightingDeclarations:''}
 ${hasNormals?normalAtlasDeclarations:''}
 #include <fog_pars_fragment>
 vec4 viewAt(float view){vec2 cell=vec2(clamp(vUv.x,.5/256.,255.5/256.),vUv.y);return texture2D(uAtlas,vec2((mod(view,8.)+cell.x)/8.,cell.y));}
 ${prelitAtlas?`vec4 prelitAt(sampler2D atlas,float view,float row){vec2 cell=clamp(vUv,vec2(.5/${prelitResolution}.),vec2(${prelitResolution-.5}/${prelitResolution}.));return texture2D(atlas,vec2((mod(view,${prelitViews}.)+cell.x)/${prelitViews}.,(${rotationViews-1}. -mod(row,${rotationViews}.)+cell.y)/${rotationViews}.));}
 vec4 prelitPair(sampler2D atlas,float first,float row){return uBlend>.5?mix(prelitAt(atlas,first,row),prelitAt(atlas,first+1.,row),fract(vView*${prelitViews}./8.)):prelitAt(atlas,floor(vView*${prelitViews}./8.+.5),row);}
 vec4 prelitPhase(sampler2D atlas,float first){${rotationViews>1?'float row=floor(vPrelitRotation);return uRotationBlend>.5?mix(prelitPair(atlas,first,row),prelitPair(atlas,first,row+1.),fract(vPrelitRotation)):prelitPair(atlas,first,floor(vPrelitRotation+.5));':'return prelitPair(atlas,first,0.);'}}
 vec4 prelitColor(float first){vec4 color;if(uNight<=0.)color=prelitPhase(uPrelitDay,first);else if(uNight>=1.)color=prelitPhase(uPrelitNight,first);else color=mix(prelitPhase(uPrelitDay,first),prelitPhase(uPrelitNight,first),uNight);return color;}`:''}
 void main(){float first=floor(vView);vec4 c=${prelitAtlas?'uPrelitEnabled>.5?prelitColor(floor(vView*'+prelitViews+'./8.)):(':''}(uBlend>.5?mix(viewAt(first),viewAt(first+1.),fract(vView)):viewAt(floor(vView+.5)))${prelitAtlas?')':''};if(c.a<.35||coverageThreshold(gl_FragCoord.xy)<1.-vMix*vDensityFade)discard;${prelitAtlas?'if(uPrelitEnabled>.5){gl_FragColor=vec4(c.rgb/max(c.a,.0001),1.);}else{':''}${toon?(hasNormals?normalAtlasLightingColor():impostorLightingColor):'gl_FragColor=vec4(c.rgb/max(c.a,.0001)*uLighting,1.);'}${prelitAtlas?'}':''}
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
 }`});
 if(toon)material.toneMapped=false;
 const impostors=new THREE.Mesh(geometry,material);impostors.frustumCulled=false;impostors.castShadow=false;
 const modelGeometry=source.geometry.clone();attrs(modelGeometry,trees.length);
 const originalColor=source.material.color.clone(),modelMaterial=toon?source.material.clone():new THREE.MeshBasicMaterial({map:source.material.map,color:originalColor,alphaTest:source.material.alphaTest,side:source.material.side});
 if(toon){modelMaterial.userData={...source.material.userData};modelMaterial.onBeforeCompile=source.material.onBeforeCompile;modelMaterial.customProgramCacheKey=()=>source.material.customProgramCacheKey()+'|far-lod-experiment';}
 const originalCompile=modelMaterial.onBeforeCompile;
 modelMaterial.onBeforeCompile=(shader,renderer)=>{originalCompile.call(modelMaterial,shader,renderer);shader.uniforms.uStart=uniforms.uStart;shader.uniforms.uEnd=uniforms.uEnd;shader.uniforms.uReady=uniforms.uReady;shader.vertexShader='attribute vec3 aTreeBase;uniform float uStart,uEnd,uReady;varying float vMix;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvMix=1.-uReady*(1.-smoothstep(uStart,uEnd,length(cameraPosition.xz-aTreeBase.xz)));');shader.fragmentShader='varying float vMix;\n'+coverageThreshold+'\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(coverageThreshold(gl_FragCoord.xy)>=1.-vMix)discard;');};
 if(toon)toon.material(modelMaterial);
 const models=new THREE.InstancedMesh(modelGeometry,modelMaterial,trees.length);models.frustumCulled=false;models.castShadow=false;models.count=0;
 const selection=new NearTreeSelection(trees),dummy=new THREE.Object3D();let matrixUploads=0;
 function update(camera){
  if(selection.update(camera.position.x,camera.position.z,uniforms.uEnd.value,uniforms.uReady.value>0)){
   for(const [slot,index] of selection.indices.entries()){const t=trees[index];dummy.position.copy(t.origin??modelOrigin(t,metadata.localBase,t.yaw,t.scale));dummy.rotation.y=t.yaw;dummy.scale.set(t.sx??t.scale,t.sy??t.scale,t.sz??t.scale);dummy.updateMatrix();models.setMatrixAt(slot,dummy.matrix);modelGeometry.attributes.aTreeBase.setXYZ(slot,t.x,t.y,t.z);}
   models.count=selection.indices.length;models.instanceMatrix.needsUpdate=true;modelGeometry.attributes.aTreeBase.needsUpdate=true;matrixUploads++;
  }
  if(!toon)modelMaterial.color.copy(originalColor).multiply(uniforms.uLighting.value);
 }
 function stats(){return {selectionScans:selection.scans,matrixUploads};}
 function dispose({disposeTexture=true}={}){geometry.dispose();material.dispose();modelGeometry.dispose();modelMaterial.dispose();models.dispose();if(disposeTexture){texture.dispose();normalAtlas?.dispose();prelitAtlas?.day.dispose();prelitAtlas?.night.dispose();}}
 return {impostors,models,uniforms,update,stats,dispose};
}
