import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
// QA only. Original mesh objects remain in data.model for canonical collision,
// skin support and recovery; the experimental draw mesh is its sibling.
export async function installAnimalCostVariant(world,variant){
 if(!['A','B','C','D'].includes(variant))throw Error('Unknown animal cost variant');
 const animals=world.state.raid?.animals??[];if(animals.length!==16)throw Error('Experiment requires exactly 16 animals');
 const species=[...new Set(animals.map(a=>a.species))],loader=new GLTFLoader(),low=new Map();
 for(const name of species){const asset=await loader.loadAsync('/tests/fixtures/animal-cost/'+name+'-ultralight.glb');let mesh;asset.scene.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});if(!mesh)throw Error('Missing low mesh');low.set(name,mesh);}
 const simple=new THREE.MeshStandardMaterial({color:0x8b7964,roughness:1,metalness:0}),records=[],stats={actorUpdateMs:0,mixerMs:0,expressionMs:0,mixerCalls:0,skippedVisualMixerCalls:0};let visual=false;
 for(const animal of animals){const data=world.mixers.get(animal.id);if(!data)throw Error('Actor not loaded '+animal.id);const originalMeshes=[];data.model.traverse(o=>{if(o.isMesh)originalMeshes.push({mesh:o,visible:o.visible,material:o.material});});const template=low.get(animal.species),bones=new Map();data.model.traverse(o=>{if(o.isBone)bones.set(o.name,o);});
  const skel=new THREE.Skeleton(template.skeleton.bones.map(b=>{const bone=bones.get(b.name);if(!bone)throw Error('Missing bone '+b.name);return bone;}),template.skeleton.boneInverses.map(m=>m.clone()));
  const mesh=new THREE.SkinnedMesh(template.geometry,simple);mesh.bind(skel,template.bindMatrix);mesh.name='QA-ultralight-'+animal.id;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.position.copy(data.model.position);mesh.quaternion.copy(data.model.quaternion);mesh.scale.copy(data.model.scale);data.model.parent.add(mesh);mesh.visible=variant==='B'||variant==='C';
  for(const o of originalMeshes){if(mesh.visible)o.mesh.visible=false;if(variant==='D')o.mesh.material=simple;}
  const update=data.mixer.update;data.mixer.update=function(dt){if(variant==='C'&&visual){stats.skippedVisualMixerCalls++;return this;}const t=performance.now();try{stats.mixerCalls++;return update.call(this,dt);}finally{stats.mixerMs+=performance.now()-t;}};
  const expression=data.expression,expressionUpdate=expression?.update;if(expression)expression.update=function(...args){if(variant==='C'&&visual)return;const t=performance.now();try{return expressionUpdate.apply(this,args);}finally{stats.expressionMs+=performance.now()-t;}};
  records.push({data,mesh,skel,originalMeshes,update,expression,expressionUpdate});
 }
 const originalUpdate=world.updateActor;world.updateActor=function(entity,...args){const record=records.find(r=>r.data===this.mixers.get(entity.id));if(!record)return originalUpdate.call(this,entity,...args);visual=true;const t=performance.now();try{return originalUpdate.call(this,entity,...args);}finally{visual=false;stats.actorUpdateMs+=performance.now()-t;record.mesh.position.copy(record.data.model.position);record.mesh.quaternion.copy(record.data.model.quaternion);record.mesh.scale.copy(record.data.model.scale);}};
 return {variant,stats,reset(){for(const k of Object.keys(stats))stats[k]=0;},dispose(){world.updateActor=originalUpdate;for(const r of records){r.data.mixer.update=r.update;if(r.expression)r.expression.update=r.expressionUpdate;for(const o of r.originalMeshes){o.mesh.visible=o.visible;o.mesh.material=o.material;}r.mesh.removeFromParent();r.skel.dispose();}simple.dispose();for(const mesh of low.values()){mesh.geometry.dispose();mesh.material.dispose();mesh.skeleton.dispose();}},scope:'Canonical models stay resident for physics. B/C draw one 448-triangle skinned mesh. C skips visual mixer/expression evaluation only; physical/recovery evaluation and support remain. Memory is not a low-asset residency measurement.'};
}
