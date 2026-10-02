import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ANIMAL_ACTIONS as A} from '../src/simulation/animal-actions-data.js';
import {prepareAnimalClips,applyAnimalPose,animalGroundSamples,animalPose,prepareAnimalModel} from '../src/rendering/animal-actions.js';
import * as Game from '../src/simulation/game.js';
import {updateRaid} from '../src/simulation/raids.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const attacks=['Right_Hand_Sword_Slash','Charged_Upward_Slash','Weapon_Combo','Weapon_Combo_2'];
const nav={version:1,placement:()=>({valid:true}),setState:()=>{},walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
function fixture(species,name,hits=1){
  const s=Game.newGame({slotId:'animal',seed:712});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:0,z:0},nav);
  const center=s.structures[0],duration=A.animals[species].clips[name].duration;
  const animal={id:'animal-test',species,x:0,z:4,radius:.45,spawn:{x:0,z:10},targetId:center.id,reservation:'structure:'+center.id,
    hitsRemaining:hits,status:'attacking',animation:name,attackId:'attack-test',attackDuration:duration,attackRemaining:duration,hitApplied:false};
  s.raid={id:'raid',animals:[animal],reservations:{[animal.reservation]:animal.id},encounters:[]};s.initialPreparation=false;s.time=320;
  return {s,animal,center,duration};
}
for(const [species,library] of Object.entries(A.animals))for(const name of attacks)test(`${species}/${name}: complete native duration, one hit, saved progress and physical retreat`,()=>{
  const {s,animal,center,duration}=fixture(species,name),hp=center.hp;
  updateRaid(s,duration/2,nav);assert.equal(center.hp,hp);assert.equal(animal.hitsRemaining,1);assert.equal(animal.status,'attacking');
  assert.ok(Math.abs(animalPose(animal,0).time-duration/2)<1e-9);
  const loaded=deserialize(serialize(s)),copy=loaded.raid.animals[0];updateRaid(loaded,duration/2-.001,nav);
  assert.equal(loaded.structures[0].hp,hp);assert.equal(copy.status,'attacking');updateRaid(loaded,.001,nav);
  assert.ok(loaded.structures[0].hp<hp);assert.equal(copy.hitsRemaining,0);
  assert.equal(loaded.events.filter(e=>e.type==='AnimalLogicalHit').length,1);
  const afterHit=deserialize(serialize(loaded));updateRaid(afterHit,.01,nav);
  assert.equal(afterHit.raid.animals[0].status,'retreating');assert.equal(afterHit.raid.animals[0].hitsRemaining,0);
  assert.equal(afterHit.events.filter(e=>e.type==='AnimalLogicalHit').length,1);assert.equal(afterHit.structures[0].hp,loaded.structures[0].hp);
  assert.equal(library.clips[name].loop,false);
});

test('An invalidated target cannot be replaced underneath a committed attack or receive phantom damage',()=>{
  const {s,animal,center,duration}=fixture('warthog','Weapon_Combo_2');
  center.status='ruined';center.hp=0;s.structures.push({...center,id:'replacement',status:'intact',hp:600,x:8});
  updateRaid(s,duration/2,nav);assert.equal(animal.targetId,center.id);assert.equal(s.structures[1].hp,600);
  updateRaid(s,duration/2,nav);assert.equal(animal.hitsRemaining,0);assert.equal(s.structures[1].hp,600);
  assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit').length,0);assert.equal(s.events.filter(e=>e.type==='AnimalLogicalMiss').length,1);
});
test('Exhausting a budget during an attack finishes its presentation without granting another hit',()=>{
  const {s,animal,center,duration}=fixture('lion','Weapon_Combo');animal.hitsRemaining=0;
  updateRaid(s,duration/2,nav);assert.equal(animal.status,'attacking');assert.equal(center.hp,600);
  updateRaid(s,duration/2,nav);assert.equal(center.hp,600);assert.equal(animal.hitsRemaining,0);
  updateRaid(s,.01,nav);assert.equal(animal.status,'retreating');assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit').length,0);
});
test('Shield contact consumes one completed attack without damage, and blocking pause freezes the clip phase',()=>{
  const {s,animal,center,duration}=fixture('rhino','Weapon_Combo_2');
  s.spells.push({id:'shield',kind:'shield',x:0,z:0,radius:4,remaining:20});Game.pause(s,'options');const before=serialize(s);
  Game.tick(s,10,nav);assert.equal(serialize(s),before);Game.resume(s,'options');updateRaid(s,duration,nav);
  assert.equal(center.hp,600);assert.equal(animal.hitsRemaining,0);assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit').length,1);
});

function geometryOnly(buffer){
  const size=buffer.readUInt32LE(12),doc=JSON.parse(buffer.subarray(20,20+size));
  // Node omits image decoding only. Keep all geometry, skins and original tracks.
  for(const material of doc.materials){
    delete material.normalTexture;delete material.occlusionTexture;delete material.emissiveTexture;
    delete material.pbrMetallicRoughness?.baseColorTexture;delete material.pbrMetallicRoughness?.metallicRoughnessTexture;
  }
  const json=Buffer.from(JSON.stringify(doc)),length=Math.ceil(json.length/4)*4,bin=buffer.subarray(20+size),out=Buffer.alloc(20+length+bin.length,32);
  buffer.copy(out,0,0,20);out.writeUInt32LE(out.length,8);out.writeUInt32LE(length,12);json.copy(out,20);bin.copy(out,20+length);
  return out.buffer.slice(out.byteOffset,out.byteOffset+out.length);
}
for(const [species,library] of Object.entries(A.animals))test(`${species}: original GLB hash, in-place tracks, nonlooping poses and animated foot grounding`,async()=>{
  const bytes=readFileSync(new URL('../public'+library.url,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),library.sha256);
  const gltf=await new GLTFLoader().parseAsync(geometryOnly(bytes),''),clips=prepareAnimalClips(gltf.animations);
  const native=library.presentation;assert.equal(native.scale,1);const source=readFileSync(new URL('../'+native.sourceScript,import.meta.url));assert.equal(createHash('sha256').update(source).digest('hex'),native.sourceScriptSha256);assert.match(source.toString(),/avatar\.s=\[1,1,1\]/);
  gltf.scene.scale.setScalar(.1);prepareAnimalModel(gltf.scene,species);assert.deepEqual(gltf.scene.scale.toArray(),[1,1,1]);gltf.scene.updateMatrixWorld(true);
  const originalBounds=new THREE.Box3().setFromObject(gltf.scene,true);assert.ok(Math.abs(originalBounds.max.y-originalBounds.min.y-native.bindHeight)<1e-8);assert.deepEqual(originalBounds.min.toArray(),native.bindMin);assert.deepEqual(originalBounds.max.toArray(),native.bindMax);
  const parent=new THREE.Group();parent.position.set(20,5,10);parent.add(gltf.scene);
  const data={model:gltf.scene,mixer:new THREE.AnimationMixer(gltf.scene),clips,groundSamples:animalGroundSamples(gltf.scene)};
  assert.ok(data.groundSamples.length>0);
  for(const name of attacks){
    const clip=clips.find(c=>c.name===name),duration=library.clips[name].duration;
    assert.ok(Math.abs(clip.duration-duration)<1e-6);assert.equal(Math.min(...clip.tracks.map(t=>t.times[0])),0);
    const hips=clip.tracks.find(t=>/hips\.position$/i.test(t.name));assert.ok(hips);
    for(let i=0;i<hips.values.length;i+=3){assert.equal(hips.values[i],hips.values[0]);assert.equal(hips.values[i+2],hips.values[2]);}
    const a={species,status:'attacking',animation:name,attackId:name,attackDuration:duration,attackRemaining:duration*.45};
    const pose=applyAnimalPose(data,a,50);assert.equal(pose.loop,false);assert.ok(Math.abs(pose.time-duration*.55)<1e-9);assert.equal(data.action.loop,THREE.LoopOnce);
    const first=gltf.scene.position.y;applyAnimalPose(data,a,999);assert.equal(gltf.scene.position.y,first);
    const bounds=new THREE.Box3().setFromObject(gltf.scene,true),middle=bounds.getCenter(new THREE.Vector3());
    assert.ok(Math.abs(middle.x-parent.position.x)<2&&Math.abs(middle.z-parent.position.z)<2,'Skin transforms must not apply actor placement twice');
    const point=new THREE.Vector3(),inverse=parent.matrixWorld.clone().invert();let min=Infinity;
    for(const {mesh,index} of data.groundSamples){mesh.getVertexPosition(index,point);point.applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);min=Math.min(min,point.y);}
    assert.ok(min>=.022-1e-5,`${name}: native foot samples must remain above the local terrain`);
    a.attackId=name+'-again';a.attackRemaining=duration;applyAnimalPose(data,a,1000);assert.equal(data.key,a.attackId);assert.equal(data.action.time,0);
    assert.equal(gltf.scene.position.toArray().filter(Number.isFinite).length,3);
  }
  const original=gltf.animations[0],copy=clips[0];assert.notEqual(original.tracks[0].times,copy.tracks[0].times);
  assert.deepEqual(JSON.parse(readFileSync(new URL('../public/content/animal-actions.json',import.meta.url),'utf8')),A);
});
