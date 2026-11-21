// Diagnostic only: shipped geometry on flat terrain, no graphical acceptance.
import fs from 'node:fs';
import {Group,AnimationClip,AnimationMixer} from 'three';
import {actorGeometry} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {BeastCombatPhysics,beastPhysicsRuntime} from '../../src/rendering/beast-combat-physics.js';
const R=await beastPhysicsRuntime(),species='hyena';
const clip=AnimationClip.parse(JSON.parse(fs.readFileSync(new URL('../../content/source/animations/stand-up/hyena-candidate.json',import.meta.url))).clip);
const rows=[];
for(let trial=0;trial<8;trial++){
 const heading=trial*Math.PI/4,model=await actorGeometry(new URL('../../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url));
 model.userData.beastSpecies=species;
 const root=new Group();root.add(model);root.position.set(20,0,30);root.rotation.y=heading;root.updateMatrixWorld(true);
 const animal={id:'beast',species,x:20,z:30,status:'walking',hitsRemaining:8,heading,radius:.7,magicImpact:{at:10,direction:{x:1,y:-.2,z:.2},intensity:1}};
 const state={elapsed:10,structures:[],plants:[],workers:[],raid:{animals:[animal],reservations:{}}};
 const data={model,mixer:new AnimationMixer(model),clips:[new AnimationClip('Walking',1,[])]};
 const world={state,nav:{field:{surface:()=>0}},objects:new Map([[animal.id,root]]),mixers:new Map([[animal.id,data]]),onError:error=>{throw error;}};
 const manager=new BeastCombatPhysics(world,R);manager.recoveryClips=new Map([[species,clip]]);manager.step(state,0);
 const trace=[];let recovery=null;
 try{
 for(let i=0;i<1080;i++){
  state.elapsed+=1/60;
  if(i===59)animal.magicImpact={at:state.elapsed,direction:{x:1,y:-.2,z:.2},intensity:1};
  manager.step(state,1/60);manager.before(animal.id);root.position.set(animal.x,0,animal.z);root.rotation.y=animal.heading;root.updateMatrixWorld(true);manager.render(animal.id);
  const e=manager.entries.get(animal.id);if(e?.recovery)recovery=e.recovery.constructor.name;
  if(i%12===0)trace.push({time:state.elapsed-10,phase:animal.magicDown?.phase,roll:e?.actor.roll?{error:e.actor.roll.error,speed:e.actor.roll.speed}:null});
  if(i>60&&!animal.magicDown)break;
 }
 const row={heading,recovery,finished:!animal.magicDown,lastRoll:manager.stats.lastRoll,trace};rows.push(row);console.log(JSON.stringify({...row,trace:undefined}));
 }finally{manager.dispose();}
}
fs.writeFileSync(process.argv[2]??'test-results/repeat-hit-roll-probe.json',JSON.stringify({scope:'Flat-terrain Node diagnostic; actual GLB, two impacts one second apart. No graphical or browser timing claim.',rows},null,2));
