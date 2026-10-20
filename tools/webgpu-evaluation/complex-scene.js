import {Assets} from '/src/rendering/assets.js';
import {syncWorkerToolVisibility} from '/src/rendering/worker-tool-visibility.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

// Render-only submission diagnostic. This intentionally does not claim AfricanToon parity.
export async function createComplexScene({THREE,backend,renderer}) {
 const StandardMaterial=backend==='legacy'?THREE.MeshStandardMaterial:THREE.MeshStandardNodeMaterial;
 const assets=new Assets(), fetchJSON=async name=>(await fetch(`/content/${name}.json`)).json();
 const [models,villages,biome,walls,workerActions]=await Promise.all(['models','villages','biome-savanna','walls','worker-actions'].map(fetchJSON));
 const village=villages.find(v=>v.id==='mapungubwe');
 const workerDescriptor=workerActions.youngMale;
 const animalDescriptor=models.find(m=>m.source.includes('Bufalo'));
 const cropDescriptor=models.find(m=>m.source.includes('Cultivos'));
 const [buildings,plants,wallMeshes,worker,animal,crops]=await Promise.all([
  assets.village(village),assets.biome(biome),assets.walls({...walls,pieces:{adobe_intacto:walls.pieces.adobe_intacto}}),
  assets.model(workerDescriptor.url),assets.model(animalDescriptor.url),assets.model(cropDescriptor.url)
 ]);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#cbd4bf');
 const camera=new THREE.PerspectiveCamera(48,1280/720,.2,260);
 const ambient=new THREE.HemisphereLight('#e5edff','#8e6c3e',2.1),sun=new THREE.DirectionalLight('#fff0c7',2.6);
 sun.position.set(-35,60,25);scene.add(ambient,sun);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:160});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.0002;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 // Common Three directional shadow pass; this is not the native cached shadow system.
 const ownedGeometries=new Set(),ownedMaterials=new Set(),materialCache=new Map();
 function material(source){
  if(materialCache.has(source))return materialCache.get(source);
  const target=new StandardMaterial();
  for(const key of ['map','normalMap','roughnessMap','metalnessMap','alphaMap','emissiveMap','roughness','metalness','alphaTest','opacity','transparent','side','depthWrite','vertexColors'])if(source[key]!==undefined)target[key]=source[key];
  target.color.copy(source.color??new THREE.Color(1,1,1));target.emissive.copy(source.emissive??new THREE.Color(0,0,0));
  if(source.normalScale)target.normalScale.copy(source.normalScale);
  ownedMaterials.add(target);materialCache.set(source,target);return target;
 }
 function converted(root){root.traverse(m=>{if(m.isMesh){m.material=Array.isArray(m.material)?m.material.map(material):material(m.material);m.castShadow=m.receiveShadow=true}});return root}
 function centeredGeometry(mesh){
  const g=mesh.geometry.clone();g.applyMatrix4(mesh.matrixWorld);
  // Draw-range village bounds are authored; automatic geometry bounds include the entire atlas.
  const box=mesh.userData.unit?new THREE.Box3(new THREE.Vector3().fromArray(mesh.userData.unit.min),new THREE.Vector3().fromArray(mesh.userData.unit.max)):new THREE.Box3().setFromBufferAttribute(g.attributes.position);
  const center=box.getCenter(new THREE.Vector3());g.translate(-center.x,-box.min.y,-center.z);
  g.boundingBox=box.clone().translate(new THREE.Vector3(-center.x,-box.min.y,-center.z));g.boundingSphere=g.boundingBox.getBoundingSphere(new THREE.Sphere());ownedGeometries.add(g);return g;
 }
 const buildingGeometries=buildings.slice(0,4).map(m=>{m.updateMatrixWorld(true);return centeredGeometry(m)});
 crops.scene.updateMatrixWorld(true);const cropParts=[];crops.scene.traverse(m=>{if(m.isMesh&&cropParts.length<4)cropParts.push({g:centeredGeometry(m),m:material(m.material)})});
 const dummy=new THREE.Object3D(),chunks=[],actors=[],mixers=[],workerToolRecords=[];
 function instances(g,m,poses,parent){const mesh=new THREE.InstancedMesh(g,m,poses.length);poses.forEach((p,i)=>{dummy.position.set(p[0],p[1],p[2]);dummy.rotation.set(0,p[4]??0,0);dummy.scale.setScalar(p[3]??1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});mesh.computeBoundingSphere();mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh}
 const hash=n=>{const f=Math.sin(n*78.233+712)*43758.5453;return f-Math.floor(f)};
 for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
  const chunk=new THREE.Group();chunk.position.set(x*32,0,z*32);scene.add(chunk);chunks.push(chunk);
  buildings.slice(0,4).forEach((b,i)=>instances(buildingGeometries[i],material(b.material),[[i%2*13-7,0,Math.floor(i/2)*13-7,15,(i%2)*Math.PI]],chunk));
  cropParts.forEach((part,j)=>instances(part.g,part.m,Array.from({length:12},(_,i)=>[i%4*1.4-5,0,Math.floor(i/4)*1.4+10+j*1.2,.8,hash(i+j)*6.28]),chunk));
  [0,1,4,5,8].forEach((type,j)=>{const p=plants[type][Math.min(2,plants[type].length-1)];instances(p.geometry,material(p.material),Array.from({length:3},(_,i)=>[-14+hash(i+j*7)*28,0,-14+hash(i+j*19+500)*28,.55+hash(i+90)*.35,hash(i+j)*6.28]),chunk)});
  const wall=wallMeshes.adobe_intacto;instances(wall.geometry,material(wall.material),Array.from({length:10},(_,i)=>[-13+i*2.7,0,-15,1]),chunk);
 }
 for(const [gltf,count,kind,size]of [[worker,24,'worker',1.75],[animal,8,'animal',1.7]]){
  for(let i=0;i<count;i++){
   const root=converted(cloneSkeleton(gltf.scene));const bounds=new THREE.Box3().setFromObject(root),scale=size/Math.max(bounds.max.y-bounds.min.y,.01);
   const wrapper=new THREE.Group();root.scale.setScalar(scale);root.position.y=-bounds.min.y*scale;wrapper.add(root);scene.add(wrapper);
   const base=new THREE.Vector3(-36+hash(i+77+(kind==='animal'?100:0))*72,0,-36+hash(i+111)*72);
   actors.push({wrapper,base,index:i});const mixer=new THREE.AnimationMixer(root);if(gltf.animations.length)mixer.clipAction(gltf.animations[0]).play();mixers.push(mixer);if(kind==='worker')workerToolRecords.push({model:root,mixer});
  }
 }
 const groundGeometry=new THREE.PlaneGeometry(120,120,1,1);groundGeometry.rotateX(-Math.PI/2);ownedGeometries.add(groundGeometry);
 const groundMaterial=new StandardMaterial({color:'#b5a775',roughness:1});ownedMaterials.add(groundMaterial);const ground=new THREE.Mesh(groundGeometry,groundMaterial);ground.position.y=-.02;ground.receiveShadow=true;scene.add(ground);
 let lastChunkEpoch=-1;
 const metadata={scope:'Real game assets in a deterministic render-only stress layout; common standard lighting, NOT migrated AfricanToon or a saved advanced campaign',
  materialRoute:backend==='legacy'?'MeshStandardMaterial / WebGLRenderer':'MeshStandardNodeMaterial / WebGPURenderer',
  parityCaution:'PCF filtering can differ between WebGLRenderer and WebGPURenderer; compare shadow captures before interpreting timings',
  seed:712,logical:{chunks:9,buildings:36,crops:9*12*cropParts.length,vegetation:135,walls:90,workers:24,animals:8},
  sources:{village:village.id,biome:biome.biomeId,worker:workerDescriptor.url,animal:animalDescriptor.url,crops:cropDescriptor.url},
  omissions:['AfricanToon and custom surface hooks','Native shadow cache (common Three 1024px PCF shadow replaces it)','Wild Engine simulation/navigation','Real chunk IO/worker streaming','Terrain POM, water, VFX and gameplay LOD'],
  streaming:{kind:'preloaded chunk relocation every 1.5 camera-step seconds; measures matrix/bounds submission only',events:0,lastCpuMs:0},memory:{gpuBytes:null,note:'Asset GPU allocation unavailable; renderer resource counts are reported by harness'}};
 function update(time,night=0,cameraStep=0){
  ambient.intensity=night?.5:2.1;sun.intensity=night?.18:2.6;sun.color.set(night?'#8095d6':'#fff0c7');scene.background.set(night?'#182137':'#cbd4bf');
  camera.position.set(58+Math.sin(cameraStep*.6)*12,48+Math.sin(cameraStep*.3)*4,68+Math.cos(cameraStep*.6)*8);camera.lookAt(Math.sin(cameraStep*.25)*12,0,0);camera.updateMatrixWorld();
  actors.forEach(({wrapper,base,index})=>{wrapper.position.copy(base);wrapper.position.x+=Math.sin(time*.6+index)*2;wrapper.rotation.y=time*.2+index});mixers.forEach(m=>m.setTime(time));workerToolRecords.forEach(r=>syncWorkerToolVisibility(r));
  const epoch=Math.floor(cameraStep/1.5);if(epoch!==lastChunkEpoch){const start=performance.now();chunks.forEach((c,i)=>{c.position.x=(i%3-1)*32+((epoch%2)&&i%3===0?96:0)});scene.updateMatrixWorld(true);metadata.streaming.lastCpuMs=performance.now()-start;metadata.streaming.events++;lastChunkEpoch=epoch}
 }
 update(0);
 return {scene,camera,update,metadata,dispose(){sun.shadow.dispose();mixers.forEach(m=>m.stopAllAction());scene.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.dispose();if(m.isInstancedMesh)m.dispose()});ownedGeometries.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());assets.disposeModels();scene.clear()}};
}
