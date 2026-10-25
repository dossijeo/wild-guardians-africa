import * as THREE from 'three';
import {createNativeShadowUniforms,installNativeShadow} from '/src/rendering/native-shadow.js';
// Offline QA bake using the exact native fern shader, geometry and depth shader.
export async function bakeNativeFernSprites(world){
 const source=world.groundDetails.meshes[0].mesh;
 if(!world.groundDetails.cardStudy)throw Error('Native approved fern required');
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,preserveDrawingBuffer:true});renderer.setSize(512,512);renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1.4,1.4,1.4,-1.4,.01,20);camera.position.set(0,5,.00001);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const sun=new THREE.DirectionalLight(0xffffff,1);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-1.6,right:1.6,top:1.6,bottom:-1.6,near:.01,far:15});scene.add(sun,sun.target);
 const shadows=createNativeShadowUniforms(),release=installNativeShadow(renderer,sun,shadows);
 const geometry=source.geometry.clone();geometry.setAttribute('coverageAnchor',new THREE.InstancedBufferAttribute(new Float32Array([0,0,0,1]),4));geometry.setAttribute('coverageData',new THREE.InstancedBufferAttribute(new Float32Array([0,.5,0,0]),4));geometry.setAttribute('coverageSlope',new THREE.InstancedBufferAttribute(new Float32Array([0,0]),2));geometry.instanceCount=1;
 const material=source.material.clone();material.vertexShader=material.vertexShader.replace('vec3 worldP=(modelMatrix*vec4(root+pos,1.)).xyz;','vec3 worldP=(modelMatrix*vec4(position,1.)).xyz;');material.uniforms={...THREE.UniformsUtils.clone(source.material.uniforms),...shadows};
 for(const [key,value]of Object.entries({uCoverageTime:0,uCoverageWindStrength:0,uCoverageSpacing:1,uCoverageFar:10000,uCoverageRefined:1,uNight:0}))material.uniforms[key].value=value;
 material.visible=true;material.colorWrite=true;material.depthWrite=true;geometry.setDrawRange(0,Infinity);
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.castShadow=true;scene.add(mesh);
 const depth=source.customDepthMaterial.clone();depth.vertexShader=depth.vertexShader.replace('vec3 worldP=(modelMatrix*vec4(root+pos,1.)).xyz;','vec3 worldP=(modelMatrix*vec4(position,1.)).xyz;');depth.uniforms={...material.uniforms,uFernEye:{value:camera.position}};depth.userData.nativeShadowInputs=()=>[material.uniforms.uLightDir.value];mesh.customDepthMaterial=depth;
 const groundGeometry=new THREE.PlaneGeometry(2.8,2.8);groundGeometry.rotateX(-Math.PI/2);const groundMaterial=new THREE.ShadowMaterial({opacity:1});const ground=new THREE.Mesh(groundGeometry,groundMaterial);ground.receiveShadow=true;ground.position.y=.005;
 const direction=world.toon.uniforms.uLightDir.value.clone().normalize(),results=[];
 try{
  const savedVertex=material.vertexShader;material.vertexShader='void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';const savedFragment=material.fragmentShader;material.fragmentShader='out vec4 debugColor;void main(){debugColor=vec4(1.,0.,0.,1.);}';material.needsUpdate=true;renderer.render(scene,camera);results.push({name:'debug-geometry.png',data:renderer.domElement.toDataURL('image/png').split(',')[1]});material.fragmentShader=savedFragment;material.vertexShader=savedVertex;material.needsUpdate=true;
  for(let i=0;i<8;i++){
   const angle=i*Math.PI/4,c=Math.cos(angle),s=Math.sin(angle);
   // Inverse of native instance yaw, so baked local lighting rotates back correctly.
   const local=new THREE.Vector3(c*direction.x-s*direction.z,direction.y,s*direction.x+c*direction.z);
   material.uniforms.uLightDir.value.copy(local);sun.position.copy(local).multiplyScalar(5);sun.target.position.set(0,0,0);sun.updateMatrixWorld();sun.target.updateMatrixWorld();release.cache.invalidate();
   for(const [phase,night]of [['day',0],['night',1]]){
    material.uniforms.uNight.value=night;renderer.render(scene,camera);renderer.render(scene,camera);
    results.push({name:`fern-${phase}-${i}.png`,data:renderer.domElement.toDataURL('image/png').split(',')[1]});
   }
   material.colorWrite=false;material.depthWrite=false;scene.add(ground);release.cache.invalidate();renderer.render(scene,camera);renderer.render(scene,camera);
   results.push({name:`shadow-solar-${i}.png`,data:renderer.domElement.toDataURL('image/png').split(',')[1]});scene.remove(ground);material.colorWrite=true;material.depthWrite=true;
  }
  if(renderer.getContext().getError())throw Error('Bake GL error');
  return {images:results,metadata:{debug:{draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,indexCount:geometry.index.count,position:Array.from(geometry.attributes.position.array.slice(0,6)),uv:Array.from(geometry.attributes.cardUv.array.slice(0,4)),texture:material.uniforms.uLeafCoverage.value.image?.width},orientationCount:8,angleStepDegrees:45,widthMeters:2.8,resolution:512,shadowResolution:1024,source:'approved native fern material + customDepthMaterial',dayNightSeparate:true,solarShadowSeparate:true,windFrozen:true,lightDirection:direction.toArray(),limitation:'Single clump offline bake; runtime atlas selection, wind/shadow mismatch, terrain conformity and dynamic-object shadow reception still require implementation and comparison.'}};
 }finally{
  release();sun.shadow.map?.dispose();geometry.dispose();material.dispose();depth.dispose();groundGeometry.dispose();groundMaterial.dispose();renderer.dispose();renderer.forceContextLoss();
 }
}
