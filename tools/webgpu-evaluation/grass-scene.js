import * as THREE from 'three/webgpu';
import {createGrassMaterial} from './grass-materials.js';

async function json(url){const response=await fetch(new URL(url,location.origin+'/').href);if(!response.ok)throw new Error(`${url}: ${response.status}`);return response.json();}

/** Frozen real-game selection, deliberately separate from CPU selection/compute tests. */
export async function createGrassScene({backend,renderer,scenario='grass'}){
 const snapshot=await json(`/tools/webgpu-evaluation/fixtures/${scenario==='grass-river'?'grass-snapshot-river':'grass-snapshot'}.json`);
 if(snapshot.schemaVersion!==1)throw new Error('Unsupported grass snapshot schema');
 const modules=await json(snapshot.modulesUrl);
 const source=await new THREE.TextureLoader().loadAsync(new URL(snapshot.terrain.base,location.origin+'/').href);
 source.colorSpace=THREE.NoColorSpace;source.wrapS=source.wrapT=THREE.RepeatWrapping;
 source.minFilter=THREE.LinearMipmapLinearFilter;source.magFilter=THREE.LinearFilter;
 source.generateMipmaps=true;source.anisotropy=8;source.needsUpdate=true;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#b9c5cf');
 const c=snapshot.camera,camera=new THREE.PerspectiveCamera(c.fov,1280/720,c.near,c.far);
 camera.coordinateSystem=renderer.coordinateSystem??THREE.WebGLCoordinateSystem;
 // Reproduce the exact rebased render transform rather than combining restored
 // world camera values with the temporary model matrices from the game.
 const matrix=new THREE.Matrix4().fromArray(snapshot.renderSpace.viewMatrix).invert();
 matrix.decompose(camera.position,camera.quaternion,camera.scale);
 camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 const basePosition=camera.position.clone(),baseQuaternion=camera.quaternion.clone();
 const resources=[],meshes=[];let attributeBytes=0,indexBytes=0,triangles=0,instances=0;
 const u=snapshot.uniforms;
 for(let i=0;i<snapshot.geometries.length;i++){
  const entry=snapshot.geometries[i],module=modules[entry.module];
  if(!module)throw new Error(`Missing coverage module ${entry.module}`);
  const geometry=new THREE.InstancedBufferGeometry();
  for(const [name,a]of Object.entries(entry.attributes)){
   const data=new Float32Array(a.array);
   const Attribute=a.instanced?THREE.InstancedBufferAttribute:THREE.BufferAttribute;
   geometry.setAttribute(name,new Attribute(data,a.itemSize,a.normalized));attributeBytes+=data.byteLength;
  }
  geometry.setIndex(entry.index);geometry.instanceCount=entry.count;indexBytes+=geometry.index.array.byteLength;
  if(geometry.index.count!==module.index.length)throw new Error(`Snapshot module topology changed: ${entry.module}`);
  const handle=await createGrassMaterial({backend,texture:source,refined:entry.refined,spacing:u.uCoverageSpacing*.4,far:u.uCoverageFar,time:u.uCoverageTime,night:u.uNight,seed:u.uCoverageSeed,scale:u.uCoverageScale,windStrength:u.uCoverageWindStrength,nightLight:u.uNightLight,exposure:u.uExposure,lightDirection:u.uLightDir,pigmentTint:snapshot.biome==='gran-rio'?[.93,1.08,.84]:[1.14,1.09,.97]});
  const mesh=new THREE.Mesh(geometry,handle.material);mesh.name=entry.name;
  mesh.matrixAutoUpdate=false;mesh.matrix.fromArray(snapshot.renderSpace.modelMatrices[i]);
  mesh.frustumCulled=false;mesh.visible=entry.count>0;mesh.castShadow=false;mesh.receiveShadow=false;
  scene.add(mesh);resources.push({geometry,handle});meshes.push(mesh);
  triangles+=entry.count*geometry.index.count/3;instances+=entry.count;
 }
 scene.updateMatrixWorld(true);
 const metadata={scenario:'A-frozen-resident-grass',sourceCommit:snapshot.sourceCommit,biome:snapshot.biome,seed:snapshot.seed,quality:snapshot.quality,variant:snapshot.variant,instances,triangles,drawCalls:meshes.filter(m=>m.visible).length,attributeBytes,indexBytes,textureUrl:snapshot.terrain.base,textureSize:[source.image.width,source.image.height],textureBytesEstimate:Math.ceil(source.image.width*source.image.height*4*4/3),windStrength:u.uCoverageWindStrength,uniforms:{...u},limitations:['Frozen resident selection; no CPU culling or streaming measured by this fixture.','No terrain mesh, objects or shadow visibility; this is material/backend parity only.','Texture bytes estimate is uncompressed RGBA with mip chain, not measured VRAM.'],camera:snapshot.renderSpace.cameraPosition,sourceMetadata:snapshot.metadata};
 function update(time=u.uCoverageTime,night=u.uNight,cameraStep=0){
  for(const {handle}of resources){handle.setTime(time);handle.setNight(night);}
  camera.position.copy(basePosition);camera.quaternion.copy(baseQuaternion);
  // Small deterministic path within the exported selection. Selection counts do
  // not change: both APIs submit the same geometry even while the camera moves.
  if(typeof cameraStep==='number')camera.position.add(new THREE.Vector3(Math.sin(cameraStep)*1.5,Math.sin(cameraStep*.5)*.25,(Math.cos(cameraStep)-1)*.75));
  else if(Array.isArray(cameraStep))camera.position.add(new THREE.Vector3().fromArray(cameraStep));
  camera.updateMatrixWorld(true);
 }
 let disposed=false;
 return {scene,camera,update,metadata,meshes,snapshot,dispose(){if(disposed)return;disposed=true;for(const {geometry,handle}of resources){geometry.dispose();handle.dispose();}source.dispose();scene.clear();}};
}
