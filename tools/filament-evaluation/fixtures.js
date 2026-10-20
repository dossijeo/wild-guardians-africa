import * as THREE from 'three';
import {Assets} from '/src/rendering/assets.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';

// The exact same exported world GLB is consumed by both backends. Actors retain
// their original GLBs and native skeletal clips rather than baking animation.
export async function createFixture({scenario='A', instancing=false}={}) {
  if(!['A','B'].includes(scenario)) throw Error(`Unsupported fixture ${scenario}`);
  const assets=new Assets();
  const json=async name=>{const response=await fetch(`/content/${name}.json`);if(!response.ok)throw Error(`Fixture fetch ${name}: ${response.status}`);return response.json()};
  const [models,villages,biome,actions]=await Promise.all(['models','villages','biome-savanna','worker-actions'].map(json));
  const village=villages.find(v=>v.id==='mapungubwe');
  const cropSource=models.find(m=>m.source.includes('Cultivos'));
  const animalSource=models.find(m=>m.source.includes('Bufalo'));
  const [buildings,plants,crops]=await Promise.all([assets.village(village),assets.biome(biome),assets.model(cropSource.url)]);
  const scene=new THREE.Scene(),world=new THREE.Group(),actorsRoot=new THREE.Group();
  world.name='shared-static-world';scene.add(world,actorsRoot);
  scene.background=new THREE.Color('#cbd4bf');
  const camera=new THREE.PerspectiveCamera(48,1280/720,.2,260);
  const sun=new THREE.DirectionalLight('#fff0c7',2.6),ambient=new THREE.HemisphereLight('#e5edff','#8e6c3e',2.1);
  sun.position.set(-35,60,25);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:160});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.0002;
  scene.add(sun,ambient);
  const ownedGeometries=new Set(),ownedMaterials=new Set(),materials=new Map();
  function material(source){
    if(Array.isArray(source))return source.map(material);
    if(materials.has(source))return materials.get(source);
    const target=new THREE.MeshStandardMaterial();
    for(const key of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','roughness','metalness','alphaTest','opacity','transparent','side','vertexColors'])if(source[key]!==undefined)target[key]=source[key];
    target.color.copy(source.color??new THREE.Color(1,1,1));target.emissive.copy(source.emissive??new THREE.Color(0,0,0));
    if(source.normalScale)target.normalScale.copy(source.normalScale);
    materials.set(source,target);ownedMaterials.add(target);return target;
  }
  function centeredGeometry(mesh){
    const geometry=mesh.geometry.clone();geometry.applyMatrix4(mesh.matrixWorld);
    // Exporters do not consistently preserve drawRange: trim packed village
    // indices before export so no hidden atlas geometry reaches either engine.
    if(geometry.index&&Number.isFinite(geometry.drawRange.count)){
      const {start,count}=geometry.drawRange;geometry.setIndex(new THREE.BufferAttribute(geometry.index.array.slice(start,start+count),1));geometry.setDrawRange(0,Infinity);
    }
    const bounds=mesh.userData.unit?new THREE.Box3(new THREE.Vector3().fromArray(mesh.userData.unit.min),new THREE.Vector3().fromArray(mesh.userData.unit.max)):new THREE.Box3().setFromBufferAttribute(geometry.attributes.position);
    const center=bounds.getCenter(new THREE.Vector3());geometry.translate(-center.x,-bounds.min.y,-center.z);geometry.computeBoundingBox();geometry.computeBoundingSphere();ownedGeometries.add(geometry);return geometry;
  }
  const hash=n=>{const f=Math.sin(n*78.233+712)*43758.5453;return f-Math.floor(f)};
  const dummy=new THREE.Object3D(),chunks=[];
  const metadata={scenario,seed:712,instancing,scope:'Common glTF standard-material backend diagnostic, not AfricanToon parity',logical:{chunks:9,buildings:36,vegetation:135,crops:0,workers:scenario==='B'?24:0,animals:scenario==='B'?8:0},sources:{village:village.id,biome:biome.biomeId,crops:cropSource.url,worker:actions.youngMale.url,animal:animalSource.url},omissions:['AfricanToon','continuous grass coverage (scenario C)','native gameplay terrain/streaming','water/VFX','game simulation'],shadow:{mapSize:1024,coverage:130,parityRequiresCapture:true}};
  function addCopies(g,m,poses,parent,name){
    if(instancing){
      const mesh=new THREE.InstancedMesh(g,m,poses.length);mesh.name=name;
      poses.forEach((p,i)=>{dummy.position.set(p[0],p[1],p[2]);dummy.rotation.set(0,p[4]??0,0);dummy.scale.setScalar(p[3]??1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});
      mesh.computeBoundingSphere();mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
    } else poses.forEach((p,i)=>{const mesh=new THREE.Mesh(g,m);mesh.name=`${name}-${i}`;mesh.position.set(p[0],p[1],p[2]);mesh.rotation.y=p[4]??0;mesh.scale.setScalar(p[3]??1);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh)});
  }
  const buildingGeometries=buildings.slice(0,4).map(mesh=>{mesh.updateMatrixWorld(true);return centeredGeometry(mesh)});
  const cropParts=[];crops.scene.updateMatrixWorld(true);crops.scene.traverse(mesh=>{if(mesh.isMesh&&cropParts.length<4)cropParts.push({g:centeredGeometry(mesh),m:material(mesh.material)})});
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
    const chunk=new THREE.Group();chunk.name=`chunk-${x+1}-${z+1}`;chunk.position.set(x*32,0,z*32);world.add(chunk);chunks.push(chunk);
    buildings.slice(0,4).forEach((b,i)=>addCopies(buildingGeometries[i],material(b.material),[[i%2*13-7,0,Math.floor(i/2)*13-7,15,(i%2)*Math.PI]],chunk,`building-${i}`));
    cropParts.forEach((part,j)=>{addCopies(part.g,part.m,Array.from({length:12},(_,i)=>[i%4*1.4-5,0,Math.floor(i/4)*1.4+10+j*1.2,.8,hash(i+j)*6.28]),chunk,`crop-${j}`);metadata.logical.crops+=12});
    [0,1,4,5,8].forEach((type,j)=>{const prototype=plants[type][Math.min(2,plants[type].length-1)];addCopies(prototype.geometry,material(prototype.material),Array.from({length:3},(_,i)=>[-14+hash(i+j*7)*28,0,-14+hash(i+j*19+500)*28,.55+hash(i+90)*.35,hash(i+j)*6.28]),chunk,`vegetation-${j}`)});
  }
  const groundGeometry=new THREE.PlaneGeometry(120,120,32,32);groundGeometry.rotateX(-Math.PI/2);ownedGeometries.add(groundGeometry);
  const groundMaterial=new THREE.MeshStandardMaterial({color:'#b5a775',roughness:1});ownedMaterials.add(groundMaterial);
  const ground=new THREE.Mesh(groundGeometry,groundMaterial);ground.name='terrain';ground.position.y=-.02;ground.receiveShadow=true;world.add(ground);
  const actors=[],mixers=[];
  if(scenario==='B')for(const [url,count,kind,height] of [[actions.youngMale.url,24,'worker',1.75],[animalSource.url,8,'animal',1.7]]){
    const source=await assets.model(url);
    const bounds=new THREE.Box3().setFromObject(source.scene),scale=height/Math.max(bounds.max.y-bounds.min.y,.01);
    for(let i=0;i<count;i++){
      const root=cloneSkeleton(source.scene);root.traverse(mesh=>{if(mesh.isMesh){mesh.material=material(mesh.material);mesh.castShadow=mesh.receiveShadow=true}});
      root.scale.setScalar(scale);root.position.y=-bounds.min.y*scale;
      const wrapper=new THREE.Group();wrapper.name=`actor-${kind}-${i}`;wrapper.add(root);actorsRoot.add(wrapper);
      const mixer=new THREE.AnimationMixer(root);if(source.animations.length)mixer.clipAction(source.animations[0]).play();mixers.push(mixer);
      actors.push({name:wrapper.name,url,kind,index:i,animation:0,animationCount:source.animations.length,normalization:[scale,-bounds.min.y*scale],base:[-36+hash(i+77+(kind==='animal'?100:0))*72,0,-36+hash(i+111)*72],wrapper});
    }
  }
  function actorMatrix(actor,time){
    dummy.position.set(actor.base[0]+Math.sin(time*.6+actor.index)*2,0,actor.base[2]);dummy.rotation.set(0,time*.2+actor.index,0);dummy.scale.setScalar(1);dummy.updateMatrix();
    const normalization=new THREE.Matrix4().compose(new THREE.Vector3(0,actor.normalization[1],0),new THREE.Quaternion(),new THREE.Vector3().setScalar(actor.normalization[0]));
    return dummy.matrix.clone().multiply(normalization).toArray();
  }
  function update(time,night=0,cameraStep=time){
    ambient.intensity=night?.5:2.1;sun.intensity=night?.18:2.6;sun.color.set(night?'#8095d6':'#fff0c7');scene.background.set(night?'#182137':'#cbd4bf');
    camera.position.set(58+Math.sin(cameraStep*.6)*12,48+Math.sin(cameraStep*.3)*4,68+Math.cos(cameraStep*.6)*8);camera.lookAt(Math.sin(cameraStep*.25)*12,0,0);camera.updateMatrixWorld();
    actors.forEach(actor=>{actor.wrapper.position.set(actor.base[0]+Math.sin(time*.6+actor.index)*2,0,actor.base[2]);actor.wrapper.rotation.y=time*.2+actor.index});mixers.forEach(mixer=>mixer.setTime(time));
    scene.updateMatrixWorld(true);
  }
  update(0);
  function triangleStats(root){let meshes=0,triangles=0;root.traverse(mesh=>{if(mesh.isMesh){meshes++;triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1)}});return {meshes,triangles}}
  metadata.geometry=triangleStats(scene);
  return {scene,world,camera,sun,ambient,chunks,actors,metadata,update,actorMatrix,
    actorDescriptors:actors.map(({wrapper,...descriptor})=>descriptor),
    async exportGLB(){world.updateMatrixWorld(true);return new GLTFExporter().parseAsync(world,{binary:true,onlyVisible:true,maxTextureSize:4096})},
    dispose(){sun.shadow.dispose();mixers.forEach(m=>m.stopAllAction());scene.traverse(mesh=>{if(mesh.isSkinnedMesh)mesh.skeleton.dispose();if(mesh.isInstancedMesh)mesh.dispose()});ownedGeometries.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());assets.disposeModels();scene.clear()}
  };
}
