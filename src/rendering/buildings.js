import * as THREE from 'three';
import {toonDestruction} from './african-toon.js';
import {createNativeDestruction,COLLAPSE_THRESHOLD,COLLAPSE_SECONDS,destructionVertex,destructionFragment,destructionDepthFragment,destructionOpeningFragment} from './destruction-native.js';
import {BuildingEffects} from './building-effects.js';
import {nativeBuildingBounds} from './building-bounds.js';
import {withDepthCaptureMaterials} from './depth-capture.js';
import {auxiliaryBuildingDepthFragment} from './building-depth.js';

const glsl=source=>source.replace('#version 300 es\n','');
const clamp=value=>Math.max(0,Math.min(1,value));
export function centerVisualDamage(entity){
  if(entity.status==='ruined')return 1;
  // Native setDamage latches at .79 even when one impact overshoots the threshold.
  if(entity.status==='collapsing')return COLLAPSE_THRESHOLD+(1-COLLAPSE_THRESHOLD)*clamp(1-entity.collapseRemaining/COLLAPSE_SECONDS);
  return clamp(1-entity.hp/entity.maxHp);
}
function geometry(data,repairNormals=null){
  const result=new THREE.BufferGeometry(),buffer=new THREE.InterleavedBuffer(data,12);
  for(const [name,size,offset] of [['aPos',3,0],['aNormal',3,3],['aUV',2,6],['aAnchor',3,8],['aSeed',1,11]])result.setAttribute(name,new THREE.InterleavedBufferAttribute(buffer,size,offset));
  // Three uses position for frustum bounds; the shader uses the same source data.
  result.setAttribute('position',result.getAttribute('aPos'));
  result.setAttribute('aRepairNormal',new THREE.BufferAttribute(repairNormals??new Float32Array(data.length/4),3));
  result.computeBoundingBox();result.computeBoundingSphere();return result;
}
export function prepareNativeBuilding(gltf,building){
  const meshes=[];gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
  if(meshes.length!==1)throw new Error('DEST requiere la malla original de una sola primitiva');
  const mesh=meshes[0],identity=new THREE.Matrix4();
  if(mesh.matrixWorld.elements.some((v,i)=>Math.abs(v-identity.elements[i])>1e-9))throw new Error('Transformación de casa DEST no compatible');
  const original=mesh.geometry,positions=new Float32Array(original.getAttribute('position').array),normals=new Float32Array(original.getAttribute('normal').array),uv=new Float32Array(original.getAttribute('uv').array),indices=original.index.array;
  const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  for(let i=0;i<positions.length;i++){const axis=i%3;bounds.min[axis]=Math.min(bounds.min[axis],positions[i]);bounds.max[axis]=Math.max(bounds.max[axis],positions[i]);}
  const center=[(bounds.min[0]+bounds.max[0])/2,bounds.min[1],(bounds.min[2]+bounds.max[2])/2];
  for(let i=0;i<positions.length;i++)positions[i]-=center[i%3];
  for(let axis=0;axis<3;axis++){bounds.min[axis]-=center[axis];bounds.max[axis]-=center[axis];}
  const kernel=createNativeDestruction(building,{positions,normals,uv,indices,bounds}),body=geometry(kernel.vertices,kernel.repairNormals),ash=geometry(kernel.ash);
  const noise=new THREE.Data3DTexture(kernel.noiseBytes,32,32,32);noise.format=THREE.RedFormat;noise.type=THREE.UnsignedByteType;noise.minFilter=noise.magFilter=THREE.LinearFilter;noise.wrapS=noise.wrapT=noise.wrapR=THREE.RepeatWrapping;noise.unpackAlignment=1;noise.needsUpdate=true;
  let disposed=false;
  return {building,kernel,body,ash,noise,material:mesh.material,scale:1,culling:nativeBuildingBounds(body,ash),
    dispose(){if(disposed)return;disposed=true;body.dispose();ash.dispose();noise.dispose();original.dispose();for(const texture of new Set(Object.values(mesh.material).filter(v=>v?.isTexture)))texture.dispose();mesh.material.dispose();}};
}
function shaderMaterial(uniforms,fragmentShader){
  if(fragmentShader===destructionFragment){
    // The lab fog belongs to its standalone camera. Use the enclosing world
    // distance/color instead, while retaining its material and damage shading.
    fragmentShader=fragmentShader.replace('out vec4 fragColor;','#include <packing>\nuniform vec3 uWorldFogColor;uniform vec2 uWorldFogRange;uniform float uWorldScale;uniform float uWorldSun;uniform float uWorldAmbient;\nout vec4 fragColor;')
      .replace('vec3 direct=vec3(1.90,1.59,1.11)*ndl*sh;','ambient*=uWorldAmbient;vec3 direct=vec3(1.90,1.59,1.11)*ndl*sh*uWorldSun;')
      .replace('texture(uShadow,p.xy+vec2(x,y)*1.35/uShadowSize).r','unpackRGBAToDepth(textureLod(uShadow,p.xy+vec2(x,y)*1.35/uShadowSize,0.))');
    const start=fragmentShader.indexOf(' float dist=length(uEye-vWorld);'),end=fragmentShader.indexOf('\n}',start);
    fragmentShader=fragmentShader.slice(0,start)+' float fog=smoothstep(uWorldFogRange.x,uWorldFogRange.y,length(uEye-vWorld)*uWorldScale);\n fragColor=vec4(mix(toSRGB(tonemap(color)),uWorldFogColor,fog),1.);'+fragmentShader.slice(end);
  }
  if(fragmentShader.includes('uWorldFogColor'))fragmentShader=toonDestruction(fragmentShader);
  return new THREE.RawShaderMaterial({vertexShader:glsl(destructionVertex),fragmentShader:glsl(fragmentShader),glslVersion:THREE.GLSL3,uniforms,side:THREE.DoubleSide,toneMapped:false});
}
export class NativeBuilding extends THREE.Group {
  constructor(template,entity,pipeline,elapsed=0){
    super();this.template=template;this.pipeline=pipeline;this.entityId=entity.id;this.userData.entityId=entity.id;this.userData.nativeBuilding=true;
    this.scale.setScalar(template.scale);this.rotation.y=entity.yaw??0;
    const value=x=>({value:x}),material=template.material;
    this.uniforms={uFineNoise:pipeline.fineNoiseUniform??value(1),uWorldOrigin:pipeline.worldOriginUniform??value(new THREE.Vector2()),uVP:value(new THREE.Matrix4()),uLightVP:value(new THREE.Matrix4()),uDamage:value(0),uInner:value(0),uMode:value(0),uHoles:value(Array.from({length:8},()=>new THREE.Vector4())),uNoise:value(template.noise),uEye:value(new THREE.Vector3()),uSun:value(new THREE.Vector3(-8,13,9).normalize()),uAlbedo:value(material.map),uNormalMap:value(material.normalMap),uMR:value(material.roughnessMap),uShadow:value(null),uIntactDepth:value(pipeline.target.depthTexture),uOpeningMask:value(pipeline.target.texture),uResolution:value(new THREE.Vector2(1,1)),uAshAge:value(0),uRepair:value(template.building.repairPlaster?1:0),uTime:value(0),uShadowSize:value(1024),uShadows:value(0),uEmbers:value(1),uQuality:value(1)};
    Object.assign(this.uniforms,{uWorldFogColor:value(new THREE.Color()),uWorldFogRange:value(new THREE.Vector2(1e8,1e9)),uWorldScale:value(template.scale),uWorldSun:value(1),uWorldAmbient:value(1),uToonModel:value(new THREE.Matrix4()),uNight:value(0),uNightLight:value(1),uExposure:value(1),uKind:value(0),uSurfaceType:value(1)});
    Object.assign(this.uniforms,pipeline.environmentUniforms??{uEnvEndpoints:value(1),uNativeEnvEnabled:value(0),uEnvDay:value(null),uEnvNight:value(null),uEnvYaw:value(0)});
    this.outer=new THREE.Mesh(template.body,shaderMaterial(this.uniforms,destructionFragment));
    const depthFragment=destructionDepthFragment.replace('uniform int uMode;uniform float uUncut;','uniform int uMode;uniform float uUncut;\n#include <packing>\nout vec4 packedDepth;').replace('if(damageField(vOriginal)<0.)discard;}','if(damageField(vOriginal)<0.)discard;packedDepth=packDepthToRGBA(gl_FragCoord.z);}');
    this.outer.customDepthMaterial=shaderMaterial({...this.uniforms,uUncut:value(0)},depthFragment);this.outer.castShadow=true;this.outer.material.shadowSide=THREE.DoubleSide;
    this.outer.customDepthMaterial.userData.worldDepthCompatible=true;
    this.outer.onBeforeShadow=(renderer,object,camera,shadowCamera)=>this.cameraUniforms(this.outer,shadowCamera);
    // Depth only uses deformation/cut inputs; color camera/fog/time uniforms
    // are overwritten by other passes and do not change the silhouette.
    this.outer.userData.nativeShadowCallback=this.outer.onBeforeShadow;
    this.outer.customDepthMaterial.userData.nativeShadowInputs=()=>['uDamage','uInner','uMode','uHoles','uNoise','uUncut'].map(k=>this.outer.customDepthMaterial.uniforms[k].value);
    const innerUniforms={...this.uniforms,uInner:value(1)},ashUniforms={...this.uniforms,uMode:value(2)};
    this.inner=new THREE.Mesh(template.body,shaderMaterial(innerUniforms,destructionFragment));this.inner.material.depthFunc=THREE.LessDepth;this.inner.renderOrder=1;
    this.ash=new THREE.Mesh(template.ash,shaderMaterial(ashUniforms,destructionFragment));
    // QA opt-in only: combined depth readbacks still differ at some angles.
    // Gameplay keeps the native color recipe until equivalence is established.
    if(pipeline.auxiliaryDepth===true)for(const mesh of [this.inner,this.ash]){
      mesh.customDepthMaterial=shaderMaterial(mesh.material.uniforms,auxiliaryBuildingDepthFragment);
      mesh.customDepthMaterial.depthFunc=mesh.material.depthFunc;
      mesh.customDepthMaterial.userData.worldDepthCompatible=true;
    }
    this.opening=new THREE.Mesh(template.body,shaderMaterial(this.uniforms,destructionOpeningFragment));this.opening.matrixAutoUpdate=false;
    for(const mesh of [this.outer,this.inner,this.ash,this.opening]){
      // Bounds include native interior recession, collapse drift and ash scaling.
      mesh.boundingSphere=mesh===this.ash?template.culling.ash:template.culling.still;
      mesh.frustumCulled=true;
      mesh.onBeforeRender=(renderer,scene,camera)=>this.cameraUniforms(mesh,camera);
    }
    this.add(this.ash,this.outer,this.inner);pipeline.add(this);this.outer.raycast=(raycaster,hits)=>this.raycastBody(raycaster,hits);this.inner.raycast=()=>{};
    this.ash.raycast=(raycaster,hits)=>{if(this.damage>=.9998)THREE.Mesh.prototype.raycast.call(this.ash,raycaster,hits);};this.effects=new BuildingEffects(this);this.update(entity,elapsed);
  }
  cameraUniforms(mesh,camera){
    this.uniforms.uToonModel.value.copy(mesh.matrixWorld);const inverse=new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    this.uniforms.uVP.value.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(mesh.matrixWorld);
    this.uniforms.uEye.value.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inverse);
    if(this.pipeline.sun)this.uniforms.uSun.value.copy(this.pipeline.sun.position).sub(this.pipeline.sun.target.position).transformDirection(inverse);
    const shadow=this.pipeline.sun?.shadow;
    if(shadow?.map){this.uniforms.uShadow.value=shadow.map.texture;this.uniforms.uShadowSize.value=shadow.mapSize.x;this.uniforms.uLightVP.value.copy(shadow.camera.projectionMatrix).multiply(shadow.camera.matrixWorldInverse).multiply(mesh.matrixWorld);}
    this.uniforms.uNight.value=this.pipeline.night??((this.pipeline.sun?.intensity??3)<1?1:0);
    this.uniforms.uNightLight.value=this.pipeline.nightLight??1.12;
    this.uniforms.uShadows.value=this.pipeline.renderer.shadowMap.enabled&&this.pipeline.sun?.castShadow&&shadow?.map?1:0;
  }
  update(entity,elapsed){
    this.damage=centerVisualDamage(entity);this.uniforms.uDamage.value=this.damage;this.uniforms.uTime.value=elapsed;
    this.uniforms.uQuality.value=this.pipeline.quality??1;
    this.rotation.y=entity.yaw??0;
    for(let i=0;i<8;i++){const site=this.template.kernel.hitSites[i],t=clamp((this.damage-site.birth)/(.91-site.birth)),radius=this.damage<=.0001?0:site.maxRadius*Math.pow(t,.70);this.uniforms.uHoles.value[i].set(...site.p,radius);}
    for(const mesh of [this.outer,this.inner,this.opening])mesh.boundingSphere=this.damage>COLLAPSE_THRESHOLD?this.template.culling.fall:this.template.culling.still;
    this.outer.visible=this.damage<.9998;this.inner.visible=this.damage>.015&&this.damage<.9998;this.ash.visible=this.damage>.23;
    this.opening.visible=this.damage>.015&&this.damage<.9998;
    this.effects.update(this.damage,elapsed);
    this.uniforms.uAshAge.value=Math.max(0,this.effects.native.time-this.effects.native.destructionAt);
  }
  raycastBody(raycaster,hits){
    if(this.damage>=.9998)return;
    this.updateWorldMatrix(true,false);
    const inverse=new THREE.Matrix4().copy(this.matrixWorld).invert(),origin=raycaster.ray.origin.clone().applyMatrix4(inverse),direction=raycaster.ray.direction.clone().transformDirection(inverse),kernel=this.template.kernel,previous=kernel.damage;
    let hit;try{kernel.setDamage(this.damage);hit=kernel.raycast(origin.toArray(),direction.toArray(),true);}finally{kernel.setDamage(previous);}
    if(!hit)return;const point=new THREE.Vector3(...hit.p).applyMatrix4(this.matrixWorld),distance=point.distanceTo(raycaster.ray.origin);
    if(distance>=raycaster.near&&distance<=raycaster.far)hits.push({distance,point,object:this.outer});
  }
  dispose(){this.effects.dispose();this.pipeline.remove(this);for(const mesh of [this.outer,this.inner,this.ash,this.opening]){mesh.material.dispose();mesh.customDepthMaterial?.dispose();}this.clear();}
}
export class BuildingDestructionPass {
  constructor(renderer,sun=null,ambient=null){
    this.renderer=renderer;this.sun=sun;this.ambient=ambient;this.quality=1;this.effectQuality='medium';this.scene=new THREE.Scene();this.smokeScene=new THREE.Scene();this.buildings=new Set();this.key='';
    this.target=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true});
    this.target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);this.target.depthTexture.minFilter=this.target.depthTexture.magFilter=THREE.NearestFilter;
    this.smokeDepth=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true});this.smokeDepth.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);this.smokeDepth.depthTexture.minFilter=this.smokeDepth.depthTexture.magFilter=THREE.NearestFilter;
  }
  add(building){this.buildings.add(building);this.scene.add(building.opening);this.key='';}
  remove(building){this.buildings.delete(building);this.scene.remove(building.opening);this.key='';}
  render(camera,world=null){
    if(!this.buildings.size)return;
    camera.updateWorldMatrix(true,false);
    const size=this.renderer.getDrawingBufferSize(new THREE.Vector2()),parts=[...camera.projectionMatrix.elements,...camera.matrixWorldInverse.elements,size.x,size.y];
    for(const building of this.buildings){building.updateWorldMatrix(true,true);building.opening.matrix.copy(building.outer.matrixWorld);building.uniforms.uResolution.value.copy(size);parts.push(building.damage,...building.outer.matrixWorld.elements);
      if(world?.fog){building.uniforms.uWorldFogColor.value.copy(world.fog.color).convertLinearToSRGB();building.uniforms.uWorldFogRange.value.set(world.fog.near,world.fog.far);}else building.uniforms.uWorldFogRange.value.set(1e8,1e9);
      building.uniforms.uWorldSun.value=(this.sun?.intensity??3)/3;
      const hemisphere=this.ambient??world?.children.find(o=>o.isHemisphereLight);building.uniforms.uWorldAmbient.value=(hemisphere?.intensity??2)/2;
    }
    const key=parts.join(',');if(key===this.key)return;
    if(this.target.width!==size.x||this.target.height!==size.y)this.target.setSize(size.x,size.y);
    const renderer=this.renderer,target=renderer.getRenderTarget(),clearColor=renderer.getClearColor(new THREE.Color()),clearAlpha=renderer.getClearAlpha(),autoClear=renderer.autoClear,shadows=renderer.shadowMap.enabled;
    try{
      renderer.shadowMap.enabled=false;renderer.autoClear=true;renderer.setClearColor(0,0);renderer.setRenderTarget(this.target);renderer.render(this.scene,camera);this.key=key;
    }finally{renderer.setRenderTarget(target);renderer.setClearColor(clearColor,clearAlpha);renderer.autoClear=autoClear;renderer.shadowMap.enabled=shadows;}
  }
  depthCaptureOptions(){return {optimized:this.optimizedDepth!==false,visibleOnly:this.visibleDepthOnly!==false,nonEmptyOnly:this.nonEmptyDepthOnly===true,stockAlpha:this.stockAlphaDepth===true,materialArrays:this.materialArrayDepth===true};}
  async prepareDepth(camera,world){
    const renderer=this.renderer,target=renderer.getRenderTarget(),shadows=renderer.shadowMap.enabled;
    try{
      renderer.shadowMap.enabled=false;renderer.setRenderTarget(this.smokeDepth);
      let compiling;
      // Three starts compilation synchronously. Restore borrowed scene materials
      // immediately, then wait for those programs without holding scene mutations.
      this.depthWarmStats=withDepthCaptureMaterials(world,()=>{compiling=renderer.compileAsync(world,camera);},this.depthCaptureOptions());
      await compiling;
    }finally{renderer.setRenderTarget(target);renderer.shadowMap.enabled=shadows;}
  }
  captureDepth(camera,world){
    camera.updateWorldMatrix(true,false);
    const renderer=this.renderer,size=renderer.getDrawingBufferSize(new THREE.Vector2()),target=renderer.getRenderTarget(),autoClear=renderer.autoClear,shadows=renderer.shadowMap.enabled;
    if(this.smokeDepth.width!==size.x||this.smokeDepth.height!==size.y)this.smokeDepth.setSize(size.x,size.y);
    try{
      renderer.shadowMap.enabled=false;renderer.autoClear=true;renderer.setRenderTarget(this.smokeDepth);
      this.depthCaptureStats=withDepthCaptureMaterials(world,()=>renderer.render(world,camera),this.depthCaptureOptions());
    }finally{renderer.setRenderTarget(target);renderer.autoClear=autoClear;renderer.shadowMap.enabled=shadows;}
  }
  renderSmoke(camera,world,{depthPrepared=false}={}){
    if(![...this.buildings].some(b=>b.effects.native.smoke.length))return;
    camera.updateWorldMatrix(true,false);for(const building of this.buildings)if(building.effects.native.smoke.length)building.effects.prepareSmoke(camera);
    if(!depthPrepared)this.captureDepth(camera,world);
    const renderer=this.renderer,autoClear=renderer.autoClear,shadows=renderer.shadowMap.enabled;
    try{renderer.autoClear=false;renderer.shadowMap.enabled=false;renderer.render(this.smokeScene,camera);}finally{renderer.autoClear=autoClear;renderer.shadowMap.enabled=shadows;}
  }
  dispose(){for(const building of [...this.buildings])building.dispose();this.target.dispose();this.smokeDepth.dispose();}
}
