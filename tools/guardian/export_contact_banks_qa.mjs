import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {AnimationMixer,Group,Vector3} from 'three';
import {actorAsset} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {prepareAnimalModel,prepareAnimalClips,animalGroundSamples,applyAnimalPose} from '../../src/rendering/animal-actions.js';
import {animalFootSamples} from '../../src/rendering/animal-terrain-support.js';

// QA-only walking banks. Root identity is part of the contract; never load
// these experimental data in production without validating all fallbacks.
const banks={};
for(const species of Object.keys(ANIMAL_ACTIONS.animals).sort()){
 const path='public'+ANIMAL_ACTIONS.animals[species].url,source=await readFile(path),gltf=await actorAsset(path),model=prepareAnimalModel(gltf.scene,species),root=new Group();root.add(model);root.updateMatrixWorld(true);
 const data={model,mixer:new AnimationMixer(model),clips:prepareAnimalClips(gltf.animations),groundSamples:animalGroundSamples(model),cachedSkinning:2},animal={species,status:'walking',motionPhase:0},contacts=animalFootSamples(model),duration=ANIMAL_ACTIONS.animals[species].clips.Walking.duration,n=Math.ceil(duration*30),last=(n-1)/30,times=Array.from({length:n},(_,i)=>i/30).concat(duration-Math.min(1e-7,(duration-last)/2));
 if(!contacts.length)throw Error('No contacts for '+species);
 const samples=times.map(t=>{animal.motionPhase=t;applyAnimalPose(data,animal,t);root.updateMatrixWorld(true);return contacts.map(({mesh,index})=>Array.from(Float32Array.from(mesh.getVertexPosition(index,new Vector3()).applyMatrix4(mesh.matrixWorld).toArray())));});
 banks[species]={sourceSha256:createHash('sha256').update(source).digest('hex'),duration,times,contacts:contacts.length,samples};
}
await mkdir('.cache/contact-bank-qa',{recursive:true});await writeFile('.cache/contact-bank-qa/walking.json',JSON.stringify(banks));
console.log(JSON.stringify(Object.fromEntries(Object.entries(banks).map(([k,v])=>[k,{samples:v.samples.length,contacts:v.contacts,sourceSha256:v.sourceSha256}]))));
