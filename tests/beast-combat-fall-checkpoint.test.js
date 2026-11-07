import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,AnimationClip,AnimationMixer} from 'three';
import fs from 'node:fs';
import {beastSkin} from './helpers/beast-skin.js';
import {BeastCombatPhysics,beastPhysicsRuntime} from '../src/rendering/beast-combat-physics.js';
const R=await beastPhysicsRuntime();
function fixture(state){
 const animal=state.raid.animals[0],model=beastSkin(animal.species);model.userData.beastSpecies=animal.species;const root=new Group();root.add(model);root.position.set(animal.x,0,animal.z);root.updateMatrixWorld(true);
 const data={model,mixer:new AnimationMixer(model),clips:[new AnimationClip('Walking',1,[])]},world={state,nav:{field:{surface:()=>0}},objects:new Map([[animal.id,root]]),mixers:new Map([[animal.id,data]]),onError:error=>{throw error;}};
 return {animal,root,manager:new BeastCombatPhysics(world,R)};
}
test('fall checkpoint restores manager, binding and terrain across subsequent steps',()=>{
 const state={elapsed:10,structures:[],plants:[],workers:[],raid:{animals:[{id:'beast',species:'hyena',x:20,z:30,status:'walking',hitsRemaining:8,heading:0,radius:.7,magicImpact:{at:10,impactAt:10,direction:{x:1,y:-.2,z:.2},intensity:1}}],reservations:{}}},first=fixture(state);let second;
 try{
  first.manager.step(state,.1);for(let i=0;i<25;i++){state.elapsed+=1/60;first.manager.step(state,1/60);first.manager.before('beast');first.root.position.set(first.animal.x,0,first.animal.z);first.root.updateMatrixWorld(true);first.manager.render('beast');}
  const saved=structuredClone(state),checkpoint=structuredClone(first.manager.checkpointFall());second=fixture(saved);second.manager.restoreFall(checkpoint);
  for(let i=0;i<120;i++){
   state.elapsed+=1/60;saved.elapsed+=1/60;first.manager.step(state,1/60);second.manager.step(saved,1/60);
   for(const f of [first,second]){f.manager.before('beast');f.root.position.set(f.animal.x,0,f.animal.z);f.root.updateMatrixWorld(true);f.manager.render('beast');}
   assert.deepEqual([first.animal.x,first.animal.z],[second.animal.x,second.animal.z]);assert.deepEqual([...first.manager.entries.get('beast').actor.pose],[...second.manager.entries.get('beast').actor.pose]);
  }
 }finally{first.manager.dispose();second?.manager.dispose();}
});
test('rolling checkpoint continues into authored recovery',()=>{
 const state={elapsed:10,structures:[],plants:[],workers:[],raid:{animals:[{id:'beast',species:'hyena',x:20,z:30,status:'walking',hitsRemaining:8,heading:0,radius:.7,magicImpact:{at:10,impactAt:10,direction:{x:1,y:-.2,z:.2},intensity:1}}],reservations:{}}},first=fixture(state);let second;
 const clip=AnimationClip.parse(JSON.parse(fs.readFileSync(new URL('../content/source/animations/stand-up/hyena-candidate.json',import.meta.url))).clip);first.manager.recoveryClips=new Map([['hyena',clip]]);
 const step=(f,s)=>{s.elapsed+=1/60;f.manager.step(s,1/60);f.manager.before('beast');f.root.position.set(f.animal.x,0,f.animal.z);f.root.updateMatrixWorld(true);f.manager.render('beast');};
 try{
  first.manager.step(state,.1);for(let i=0;i<600&&!first.manager.entries.get('beast')?.rolling;i++)step(first,state);assert.equal(first.manager.entries.get('beast')?.rolling,true);
  const saved=structuredClone(state),checkpoint=structuredClone(first.manager.checkpointFall());second=fixture(saved);second.manager.recoveryClips=new Map([['hyena',clip]]);second.manager.restoreFall(checkpoint);let recovery=false;
  for(let i=0;i<180;i++){step(first,state);step(second,saved);const a=first.manager.entries.get('beast'),b=second.manager.entries.get('beast');assert.equal(!!a,!!b);assert.deepEqual([first.animal.x,first.animal.z,first.animal.magicDown?.phase],[second.animal.x,second.animal.z,second.animal.magicDown?.phase]);if(a){assert.deepEqual([...a.actor.pose],[...b.actor.pose]);recovery||=!!a.recovery;}else break;}
  assert.equal(recovery,true);
 }finally{first.manager.dispose();second?.manager.dispose();}
});
