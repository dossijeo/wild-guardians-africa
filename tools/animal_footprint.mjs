import * as THREE from 'three';
import {prepareAnimalClips} from '../src/rendering/animal-actions.js';

// Navigation uses a rotation-independent body cylinder. Arms and carried
// weapons are presentation/contact geometry, not the actor's walking body.
export function animalBodyVertices(scene){
  const meshes=[];
  scene.traverse(mesh=>{
    if(!mesh.isSkinnedMesh)return;
    const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight,vertices=[];
    for(let i=0;i<indices.count;i++){
      let dominant=0;
      for(let j=1;j<4;j++)if(weights.getComponent(i,j)>weights.getComponent(i,dominant))dominant=j;
      const name=mesh.skeleton.bones[indices.getComponent(i,dominant)].name;
      if(!/Shoulder|Arm|Hand/.test(name))vertices.push(i);
    }
    if(vertices.length)meshes.push({mesh,vertices});
  });
  if(!meshes.length)throw Error('No native skinned body vertices');
  return meshes;
}

export function bodyRadiusAt(scene,body){
  scene.updateMatrixWorld(true);
  const inverse=scene.matrixWorld.clone().invert(),point=new THREE.Vector3();let radius=0;
  for(const {mesh,vertices} of body){
    const transform=inverse.clone().multiply(mesh.matrixWorld);
    for(const i of vertices){mesh.getVertexPosition(i,point).applyMatrix4(transform);radius=Math.max(radius,Math.hypot(point.x,point.z));}
  }
  return radius;
}

export function calibrateAnimalFootprint(gltf){
  const body=animalBodyVertices(gltf.scene),bindRadius=bodyRadiusAt(gltf.scene,body),samples=64,clips={};
  const mixer=new THREE.AnimationMixer(gltf.scene);let maximum=bindRadius;
  for(const clip of prepareAnimalClips(gltf.animations).filter(c=>['Walking','Running'].includes(c.name))){
    mixer.stopAllAction();mixer.clipAction(clip).play();let radius=0;
    for(let i=0;i<=samples;i++){mixer.setTime(clip.duration*i/samples);radius=Math.max(radius,bodyRadiusAt(gltf.scene,body));}
    clips[clip.name]={samples:samples+1,radius};maximum=Math.max(maximum,radius);
  }
  mixer.stopAllAction();
  // Five centimetres of numerical/pose sampling clearance; round outward.
  const clearance=.05,radius=Math.ceil((maximum+clearance)*100)/100;
  return {method:'dominant skin weight excluding Shoulder/Arm/Hand; native in-place Walking/Running; radial body cylinder',bodyVertices:body.reduce((n,b)=>n+b.vertices.length,0),bindRadius,clips,clearance,radius};
}
