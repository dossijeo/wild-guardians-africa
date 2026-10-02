import * as THREE from 'three';
import {createNativeDestructionEffects,destructionSmokeVertex,destructionSmokeFragment,destructionDebrisVertex,destructionDebrisFragment,destructionDebrisVertices} from './destruction-effects-native.js';
import {terrainTriangleHeight} from './hand-terrain.js';
import {toonDebris} from './african-toon.js';
const glsl=source=>source.replace('#version 300 es\n','');
export class BuildingEffects {
  constructor(building){
    this.building=building;this.point=new THREE.Vector3();this.center=new THREE.Vector3();this.inverse=new THREE.Matrix4();
    this.native=createNativeDestructionEffects(building.template.kernel,building.template.building,{contactFloor:p=>.028+p.size[1]*.23+this.floorOffset(p.p[0],p.p[2])});
    const buffer=new THREE.InstancedInterleavedBuffer(new Float32Array(650*12),12);this.debrisBuffer=buffer;
    const geometry=new THREE.InstancedBufferGeometry(),shape=new THREE.InterleavedBuffer(destructionDebrisVertices,6);
    geometry.setAttribute('aPos',new THREE.InterleavedBufferAttribute(shape,3,0));geometry.setAttribute('aNormal',new THREE.InterleavedBufferAttribute(shape,3,3));geometry.setAttribute('position',geometry.getAttribute('aPos'));
    for(const [name,offset] of [['aOffset',0],['aRotation',3],['aScale',6],['aColor',9]])geometry.setAttribute(name,new THREE.InterleavedBufferAttribute(buffer,3,offset));
    geometry.instanceCount=0;
    const vertex=destructionDebrisVertex.replace('uniform mat4 uVP;uniform vec3 uSun;out vec3 vColor;','uniform mat4 uVP;uniform vec3 uSun;uniform vec3 uEye;uniform float uWorldScale;uniform float uWorldSun;uniform float uWorldAmbient;out float vDistance;out vec3 vColor;')
      .replace('vColor=aColor*(', 'vDistance=length(uEye-p)*uWorldScale;vColor=aColor*(').replace('n.y*.5+.5)+vec3', 'n.y*.5+.5)*uWorldAmbient+vec3').replace('*max(dot(n,uSun),0.));','*max(dot(n,uSun),0.)*uWorldSun);');
    const fragment=destructionDebrisFragment.replace('in vec3 vColor;out vec4 fragColor;', 'in vec3 vColor;in float vDistance;uniform vec3 uWorldFogColor;uniform vec2 uWorldFogRange;out vec4 fragColor;').replace('vec4(pow(x,vec3(1./2.2)),1.)','vec4(mix(pow(x,vec3(1./2.2)),uWorldFogColor,smoothstep(uWorldFogRange.x,uWorldFogRange.y,vDistance)),1.)');
    const cel=toonDebris(vertex,fragment);
    this.debris=new THREE.Mesh(geometry,new THREE.RawShaderMaterial({vertexShader:glsl(cel.vertex),fragmentShader:glsl(cel.fragment),glslVersion:THREE.GLSL3,uniforms:building.uniforms,side:THREE.DoubleSide,toneMapped:false}));
    this.debris.frustumCulled=false;this.debris.raycast=()=>{};this.debris.onBeforeRender=(renderer,scene,camera)=>building.cameraUniforms(this.debris,camera);
    const smokeGeometry=new THREE.InstancedBufferGeometry(),corners=new Float32Array([-1,-1,1,-1,1,1,-1,-1,1,1,-1,1]);smokeGeometry.setAttribute('aCorner',new THREE.BufferAttribute(corners,2));smokeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(Array.from({length:6},(_,i)=>[corners[i*2],corners[i*2+1],0]).flat(),3));
    this.smokeBuffer=new THREE.InstancedInterleavedBuffer(new Float32Array(512*11),11);
    for(const [name,size,offset] of [['aPosSize',4,0],['aInfo',4,4],['aColor',3,8]])smokeGeometry.setAttribute(name,new THREE.InterleavedBufferAttribute(this.smokeBuffer,size,offset));
    smokeGeometry.instanceCount=0;
    const smokeVertex=destructionSmokeVertex.replace('uniform mat4 uVP;uniform vec3 uRight;uniform vec3 uUp;', 'uniform mat4 uVP;uniform vec3 uRight;uniform vec3 uUp;uniform vec3 uEye;uniform float uWorldScale;out float vDistance;').replace('vLocal=aCorner;', 'vDistance=length(uEye-p)*uWorldScale;vLocal=aCorner;');
    const smokeFragment=destructionSmokeFragment.replace('uniform vec2 uResolution;', 'uniform vec2 uResolution;uniform vec2 uClip;uniform float uSoftness;uniform float uWorldAmbient;uniform vec2 uWorldFogRange;in float vDistance;')
      .replace('float n=.15,f=90.;','float n=uClip.x,f=uClip.y;').replace('))/.48,', '))/uSoftness,')
      .replace('texture(uNoise,vec3(vLocal*.135+.24,vInfo.w*.025)).r', 'textureLod(uNoise,vec3(vLocal*.135+.24,vInfo.w*.025),0.).r').replace('texture(uNoise,vec3(vLocal*.34+.13,vInfo.w*.031+.5)).r','textureLod(uNoise,vec3(vLocal*.34+.13,vInfo.w*.031+.5),0.).r')
      .replace('if(a<.002)discard;', 'a*=1.-smoothstep(uWorldFogRange.x,uWorldFogRange.y,vDistance);if(a<.002)discard;').replace('vColor*light,a','vColor*light*mix(uWorldAmbient,1.,step(1.5,vInfo.z)),a');
    this.smokeUniforms={...building.uniforms,uVP:{value:new THREE.Matrix4()},uRight:{value:new THREE.Vector3()},uUp:{value:new THREE.Vector3()},uDepth:{value:building.pipeline.smokeDepth.depthTexture},uClip:{value:new THREE.Vector2(.1,600)},uSoftness:{value:.48*building.template.scale}};
    this.smoke=new THREE.Mesh(smokeGeometry,new THREE.RawShaderMaterial({vertexShader:glsl(smokeVertex),fragmentShader:glsl(smokeFragment),glslVersion:THREE.GLSL3,uniforms:this.smokeUniforms,transparent:true,depthTest:false,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
    this.smoke.matrixAutoUpdate=false;this.smoke.frustumCulled=false;this.smoke.raycast=()=>{};
    this.smoke.onBeforeRender=(renderer,scene,camera)=>this.smokeCamera(camera);
    building.add(this.debris);building.pipeline.smokeScene.add(this.smoke);
  }
  floorOffset(x,z){
    const surface=this.building.pipeline.surface;if(!surface)return 0;
    const point=this.point.set(x,0,z).applyMatrix4(this.building.matrixWorld),center=this.center.setFromMatrixPosition(this.building.matrixWorld),scale=this.building.template.scale;
    return (terrainTriangleHeight(point.x,point.z,surface)-center.y)/scale;
  }
  smokeCamera(camera){
    this.inverse.copy(this.smoke.matrixWorld).invert();this.smokeUniforms.uVP.value.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(this.smoke.matrixWorld);
    this.smokeUniforms.uRight.value.setFromMatrixColumn(camera.matrixWorld,0).transformDirection(this.inverse);this.smokeUniforms.uUp.value.setFromMatrixColumn(camera.matrixWorld,1).transformDirection(this.inverse);this.smokeUniforms.uClip.value.set(camera.near,camera.far);
    return this.point.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(this.inverse).toArray();
  }
  prepareSmoke(camera){
    this.smoke.updateWorldMatrix(true,false);const packed=this.native.smokeInstances(this.smokeCamera(camera));this.smokeBuffer.array.set(packed.data);this.smokeBuffer.needsUpdate=true;this.smoke.geometry.instanceCount=packed.count;
  }
  update(damage,elapsed){
    this.building.updateWorldMatrix(true,false);this.native.configure(this.building.pipeline.effectQuality??'medium');
    if(this.lastElapsed===undefined)this.native.initialize(damage);
    else if(elapsed<this.lastElapsed)this.native.restore(damage);
    else this.native.frame(damage,elapsed-this.lastElapsed);
    this.lastElapsed=elapsed;this.packDebris();this.smoke.visible=this.native.smoke.length>0;
    this.smoke.matrix.copy(this.building.matrixWorld);
  }
  packDebris(){
    const packed=this.native.debrisInstances();this.debrisBuffer.array.set(packed.data);
    // Chips keep the native scatter and shape; only their support height follows terrain.
    if(this.building.pipeline.surface&&this.native.damage>.83){for(let i=0;i<this.native.ashChips.length;i++)this.debrisBuffer.array[i*12+1]+=this.floorOffset(this.debrisBuffer.array[i*12],this.debrisBuffer.array[i*12+2]);}
    this.debrisBuffer.needsUpdate=true;this.debris.geometry.instanceCount=packed.count;this.debris.visible=packed.count>0;
  }
  dispose(){this.native.clear();this.native.ashChips.length=0;this.building.pipeline.smokeScene.remove(this.smoke);this.building.remove(this.debris);for(const mesh of [this.debris,this.smoke]){mesh.geometry.dispose();mesh.material.dispose();}}
}
