import * as THREE from 'three';
import {createNativeVfx,createVfxAtlasRects,createVfxGeometries,packVfxSprites,vfxRigidStyles,vfxSpriteVertex,vfxSpriteFragment,vfxGeometryVertex,vfxGeometryFragment,vfxRigidVertex,vfxRigidFragment,vfxShadowVertex,vfxEnvironment,MAX_SPRITES} from './vfx-native.js';
const glsl=source=>source.replace('#version 300 es\n','');
const output=`uniform float uScale,uExposure;uniform vec3 uFogColor;uniform vec2 uFogRange;
vec3 worldColor(vec3 c){vec3 x=max(c*uExposure,vec3(0.));x=clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);return mix(pow(x,vec3(1./2.2)),uFogColor,smoothstep(uFogRange.x,uFogRange.y,length(uEye-vW)*uScale));}
`;
const fragment=source=>glsl(source).replace('void main(){',output+'void main(){');
const material=(vertexShader,fragmentShader,uniforms,transparent=false)=>new THREE.RawShaderMaterial({vertexShader:glsl(vertexShader),fragmentShader,uniforms,glslVersion:THREE.GLSL3,side:THREE.DoubleSide,toneMapped:false,transparent,depthWrite:!transparent});
function mesh(geometry,material){const result=new THREE.Mesh(geometry,material);result.frustumCulled=false;result.raycast=()=>{};return result;}

export class VfxLibrary {
  constructor(catalog,texture){
    this.texture=texture.clone();this.texture.flipY=true;this.texture.colorSpace=THREE.NoColorSpace;this.texture.minFilter=this.texture.magFilter=THREE.LinearFilter;this.texture.generateMipmaps=false;this.texture.needsUpdate=true;
    this.rects=createVfxAtlasRects(catalog,texture.image.width,texture.image.height);this.shapes=new Map();this.instances=new Set();
    for(const [id,data] of Object.entries(createVfxGeometries())){
      const g=new THREE.BufferGeometry(),buffer=new THREE.InterleavedBuffer(data,6),vertices=data.length/6;
      g.setAttribute('aPosition',new THREE.InterleavedBufferAttribute(buffer,3,0));g.setAttribute('aNormal',new THREE.InterleavedBufferAttribute(buffer,3,3));g.setAttribute('position',g.getAttribute('aPosition'));
      g.setAttribute('aColor',new THREE.BufferAttribute(new Float32Array(vertices*3).fill(1),3));g.setAttribute('aMaterial',new THREE.BufferAttribute(Float32Array.from(Array.from({length:vertices},()=>[2,.9,1,0]).flat()),4));this.shapes.set(id,g);
    }
  }
  create(id,pipeline,options){const effect=new NativeVfx(this,id,pipeline,options);this.instances.add(effect);return effect;}
  dispose(){for(const instance of [...this.instances])instance.dispose();for(const shape of this.shapes.values())shape.dispose();this.shapes.clear();this.texture.dispose();}
}

export class NativeVfx extends THREE.Group {
  constructor(library,id,pipeline,options={}){
    super();this.library=library;this.pipeline=pipeline;this.surface=options.worldSurface??null;this.surfaceMatrix=new THREE.Matrix4();this.surfaceInverse=new THREE.Matrix4();this.surfacePoint=new THREE.Vector3();this.native=createNativeVfx(id,library.rects,{...options,...(this.surface?{surface:(x,z)=>this.localSurface(x,z)}:{})});this.fragments=options.layers?.fragments!==false;this.stopped=false;this.inverse=new THREE.Matrix4();this.point=new THREE.Vector3();this.rigids=new Map();this.buffers=new Map();
    const v=value=>({value});this.uniforms={uVP:v(new THREE.Matrix4()),uView:v(new THREE.Matrix4()),uModel:v(new THREE.Matrix4()),uInst:v(true),uTime:v(0),uWind:v(options.wind??.3),uWet:v(0),uNight:v(0),uEye:v(new THREE.Vector3()),uRight:v(new THREE.Vector3()),uUp:v(new THREE.Vector3()),uScale:v(1),uExposure:v(1.03),uFogColor:v(new THREE.Color()),uFogRange:v(new THREE.Vector2(1e8,1e9)),uAtlas:v(library.texture),uDepth:v(pipeline.smokeDepth.depthTexture),uViewport:v(new THREE.Vector2()),uNear:v(.1),uFar:v(600),uSunDir:v(new THREE.Vector3()),uSun:v(new THREE.Vector3()),uSky:v(new THREE.Vector3()),uGround:v(new THREE.Vector3()),uParticleLight:v(new THREE.Vector3()),uShadowVP:v(new THREE.Matrix4()),uShadow:v(null),uShadowTexel:v(new THREE.Vector2(1/1024,1/1024)),uHasShadow:v(false)};
    for(let i=0;i<2;i++){this.uniforms['uLightPos'+i]=v(new THREE.Vector3());this.uniforms['uLightCol'+i]=v(new THREE.Vector3());}
    this.localLights=Array.from({length:2},()=>new THREE.PointLight(0xffffff,0,0,2));for(const light of this.localLights){light.visible=false;this.add(light);}
    const rigidFragment=fragment(vfxRigidFragment).replace('float hash(vec3 p)', 'uniform bool uHasShadow;\n'+THREE.ShaderChunk.packing+'\nfloat hash(vec3 p)').replace('float shadow(float nl){','float shadow(float nl){if(!uHasShadow)return 1.;').replace('float z=texture(uShadow,p.xy+vec2(x,y)*uShadowTexel*1.2).r;','float z=unpackRGBAToDepth(textureLod(uShadow,p.xy+vec2(x,y)*uShadowTexel*1.2,0.));').replace('vec4(max(c,vec3(0.)),1.)','vec4(worldColor(c),1.)');
    this.rigidMaterial=material(vfxRigidVertex,rigidFragment,this.uniforms);
    this.depthMaterial=material(vfxShadowVertex,'precision highp float;'+THREE.ShaderChunk.packing+'out vec4 fragColor;void main(){fragColor=packDepthToRGBA(gl_FragCoord.z);}',this.uniforms);
    for(const [id,shape] of library.shapes){
      const g=new THREE.InstancedBufferGeometry();for(const [name,attribute] of Object.entries(shape.attributes))g.setAttribute(name,attribute);
      const buffer=new THREE.InstancedInterleavedBuffer(new Float32Array(256*23),23);buffer.setUsage(THREE.DynamicDrawUsage);this.buffers.set(id,buffer);
      for(const [name,size,offset] of [['iModel',16,0],['iColor',3,16],['iMaterial',4,19]])g.setAttribute(name,new THREE.InterleavedBufferAttribute(buffer,size,offset));g.instanceCount=0;
      const particle=mesh(g,this.rigidMaterial);particle.castShadow=true;particle.customDepthMaterial=this.depthMaterial;particle.onBeforeRender=(r,s,c)=>this.cameraUniforms(c);particle.onBeforeShadow=(r,o,c,shadowCamera)=>this.cameraUniforms(shadowCamera);this.rigids.set(id,particle);this.add(particle);
    }
    const spriteGeometry=new THREE.InstancedBufferGeometry(),corners=new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]);spriteGeometry.setAttribute('aCorner',new THREE.BufferAttribute(corners,2));spriteGeometry.setAttribute('position',new THREE.Float32BufferAttribute(Array.from({length:6},(_,i)=>[corners[i*2],corners[i*2+1],0]).flat(),3));
    this.spriteBuffer=new THREE.InstancedInterleavedBuffer(new Float32Array(MAX_SPRITES*25),25);this.spriteBuffer.setUsage(THREE.DynamicDrawUsage);
    for(const [name,size,offset] of [['iPos',3,0],['iSize',2,3],['iAngle',1,5],['iRect',4,6],['iNext',4,10],['iColor',4,14],['iParams',4,18],['iDirection',3,22]])spriteGeometry.setAttribute(name,new THREE.InterleavedBufferAttribute(this.spriteBuffer,size,offset));spriteGeometry.instanceCount=0;
    const spriteFragment=fragment(vfxSpriteFragment).replace('smoothstep(0.,vParams.w,opaque-here)','smoothstep(0.,vParams.w*uScale,opaque-here)').replace('tex.rgb*vColor.rgb*illum,','worldColor(tex.rgb*vColor.rgb*illum),');
    this.sprites=mesh(spriteGeometry,material(vfxSpriteVertex,spriteFragment,this.uniforms,true));this.sprites.onBeforeRender=(r,s,c)=>this.cameraUniforms(c);this.sprites.renderOrder=3;this.add(this.sprites);
    const geometryFragment=fragment(vfxGeometryFragment).replace('vec4(min(c,vec3(1.7)),','vec4(worldColor(min(c,vec3(1.7))),');
    this.ribbons=mesh(new THREE.BufferGeometry(),material(vfxGeometryVertex,geometryFragment,this.uniforms,true));this.ribbons.onBeforeRender=(r,s,c)=>this.cameraUniforms(c);this.ribbons.renderOrder=2;this.add(this.ribbons);this.environment=vfxEnvironment(.43);this.setRibbonBuffer(1);
  }
  setRibbonBuffer(vertices){const capacity=2**Math.ceil(Math.log2(Math.max(1,vertices))),g=new THREE.BufferGeometry(),buffer=new THREE.InterleavedBuffer(new Float32Array(capacity*11),11);buffer.setUsage(THREE.DynamicDrawUsage);
    for(const [name,size,offset] of [['aPosition',3,0],['aNormal',3,3],['aColor',4,6],['aKind',1,10]])g.setAttribute(name,new THREE.InterleavedBufferAttribute(buffer,size,offset));g.setAttribute('position',g.getAttribute('aPosition'));g.setDrawRange(0,0);this.ribbons.geometry.dispose();this.ribbons.geometry=g;this.ribbonBuffer=buffer;this.ribbonCapacity=capacity;
  }
  // Procedural geometry may be packed during relative rendering. Terrain
  // queries retain the global transform captured during simulation advancement.
  surfaceTransform(){if(this.surface){this.updateWorldMatrix(true,false);this.surfaceMatrix.copy(this.matrixWorld);this.surfaceInverse.copy(this.surfaceMatrix).invert();}}
  localSurface(x,z){const p=this.surfacePoint.set(x,0,z).applyMatrix4(this.surfaceMatrix);p.y=this.surface(p.x,p.z);return p.applyMatrix4(this.surfaceInverse).y;}
  advance(dt){if(!this.stopped){this.surfaceTransform();this.native.advance(dt);}}
  seek(time){this.stopped=false;this.surfaceTransform();this.native.seek(time);this.packedTime=undefined;}
  clear(){this.stopped=true;this.native.clear();this.packedTime=undefined;this.sprites.visible=this.ribbons.visible=false;for(const m of this.rigids.values())m.visible=false;for(const light of this.localLights)light.visible=false;}
  cameraUniforms(camera){
    this.updateWorldMatrix(true,false);this.inverse.copy(this.matrixWorld).invert();const u=this.uniforms;
    u.uVP.value.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(this.matrixWorld);u.uView.value.copy(camera.matrixWorldInverse).multiply(this.matrixWorld);
    u.uEye.value.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(this.inverse);u.uRight.value.setFromMatrixColumn(camera.matrixWorld,0).transformDirection(this.inverse);u.uUp.value.setFromMatrixColumn(camera.matrixWorld,1).transformDirection(this.inverse);u.uScale.value=this.matrixWorld.getMaxScaleOnAxis();u.uNear.value=camera.near;u.uFar.value=camera.far;
    const shadow=this.pipeline.sun?.shadow;u.uHasShadow.value=!!(this.pipeline.renderer.shadowMap.enabled&&this.pipeline.sun?.castShadow&&shadow?.map);if(shadow?.map){u.uShadow.value=shadow.map.texture;u.uShadowVP.value.copy(shadow.camera.projectionMatrix).multiply(shadow.camera.matrixWorldInverse).multiply(this.matrixWorld);u.uShadowTexel.value.set(1/shadow.mapSize.x,1/shadow.mapSize.y);}
  }
  prepare(camera,world=null){
    if(this.stopped)return false;
    camera.updateWorldMatrix(true,false);this.cameraUniforms(camera);const u=this.uniforms,env=this.environment;u.uTime.value=this.native.time;u.uWet.value=this.native.wetness;u.uNight.value=env.night;
    for(const [name,key] of [['uSun','sun'],['uSky','sky'],['uGround','ground'],['uParticleLight','particle']])u[name].value.fromArray(env[key]);u.uSunDir.value.fromArray(env.dir).transformDirection(this.inverse);
    this.pipeline.renderer.getDrawingBufferSize(u.uViewport.value);if(world?.fog){u.uFogColor.value.copy(world.fog.color).convertLinearToSRGB();u.uFogRange.value.set(world.fog.near,world.fog.far);}else u.uFogRange.value.set(1e8,1e9);
    const sprites=this.native.sprites(),forward=this.point.setFromMatrixColumn(camera.matrixWorld,2).negate().transformDirection(this.inverse),packed=packVfxSprites(sprites,this.library.rects,{eye:u.uEye.value.toArray(),forward:forward.toArray()});this.spriteBuffer.array.set(packed.data);this.spriteBuffer.needsUpdate=true;this.sprites.geometry.instanceCount=packed.count;this.sprites.visible=packed.count>0;
    const lights=this.native.lights;for(let i=0;i<2;i++){
      u['uLightPos'+i].value.fromArray(lights.positions[i]);u['uLightCol'+i].value.fromArray(lights.colors[i]);
      // Keep native color/position on ordinary world materials too. Three uses
      // inverse-square attenuation; its far field is scaled to the lab's 1+2.2*d².
      const light=this.localLights[i];light.position.fromArray(lights.positions[i]);light.color.fromArray(lights.colors[i]);light.intensity=u.uScale.value**2/2.2;light.visible=lights.colors[i].some(c=>c>0);
    }
    if(this.packedTime!==this.native.time){
      const solids=this.native.rigidInstances();for(const [id,data] of Object.entries(solids)){const buffer=this.buffers.get(id),m=this.rigids.get(id);buffer.array.set(data.data);buffer.needsUpdate=true;m.geometry.instanceCount=data.count;m.visible=data.count>0&&(this.fragments||['water','corn','leaf'].includes(id));}
      const vertices=this.native.geometry();if(vertices.length/11>this.ribbonCapacity)this.setRibbonBuffer(vertices.length/11);this.ribbonBuffer.array.set(vertices);this.ribbonBuffer.needsUpdate=true;this.ribbons.geometry.setDrawRange(0,vertices.length/11);this.ribbons.visible=vertices.length>0;this.packedTime=this.native.time;
    }
    return packed.count>0;
  }
  dispose(){this.removeFromParent();this.clear();this.library.instances.delete(this);for(const m of this.rigids.values())m.geometry.dispose();this.rigidMaterial.dispose();this.depthMaterial.dispose();for(const m of [this.sprites,this.ribbons]){m.geometry.dispose();m.material.dispose();}this.rigids.clear();this.buffers.clear();this.clearChildren();}
  clearChildren(){super.clear();}
}
