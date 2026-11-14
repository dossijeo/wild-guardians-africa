import fs from 'node:fs';
import {Group,AnimationClip,AnimationMixer} from 'three';
import {beastSkin} from '../../tests/helpers/beast-skin.js';
import {BeastCombatPhysics,beastPhysicsRuntime} from '../../src/rendering/beast-combat-physics.js';

// Controlled ownership audit: this does not execute Game.tick or render WebGL.
const R=await beastPhysicsRuntime();
const model=beastSkin('hyena');model.userData.beastSpecies='hyena';
const root=new Group();root.add(model);root.position.set(20,0,30);root.updateMatrixWorld(true);
const animal={id:'beast',species:'hyena',x:20,z:30,status:'attacking',hitsRemaining:8,heading:0,radius:.7,attackRemaining:1,path:[{x:21,z:30}],magicImpact:{at:10,direction:{x:1,y:-.2,z:.2},intensity:1}};
const state={elapsed:10,structures:[],plants:[],workers:[],raid:{animals:[animal],reservations:{}}};
const world={state,nav:{field:{surface:()=>0}},objects:new Map([[animal.id,root]]),mixers:new Map([[animal.id,{model,mixer:new AnimationMixer(model),clips:[new AnimationClip('Walking',1,[])]}]]),onError:error=>{throw error;}};
const manager=new BeastCombatPhysics(world,R),samples=[];
const pick=()=>({x:animal.x,z:animal.z,status:animal.status,attackRemaining:animal.attackRemaining,path:animal.path,magicDown:animal.magicDown?{...animal.magicDown}:null});
const initial=pick();
try{
 for(let i=0;i<120;i++){
  state.elapsed+=1/60;manager.step(state,1/60);manager.before(animal.id);root.position.set(animal.x,0,animal.z);root.updateMatrixWorld(true);manager.render(animal.id);
  if([0,29,59,119].includes(i))samples.push({step:i+1,time:state.elapsed,...pick()});
 }
 const displacement=Math.hypot(animal.x-initial.x,animal.z-initial.z);
 if(!samples[0].magicDown||samples[0].path!==null||displacement<=.1)throw Error('Expected physical changes were not observed');
 const report={initial,samples,displacement,scope:'Controlled hyena fixture with actual Rapier manager and test rig. The control is the unchanged initial state, not a second running simulation. Terrain is flat; no Game.tick, WebGL, crowd or performance comparison.'};
 fs.writeFileSync('docs/lighting/tree-near-retexture/performance/mobility-physics-ownership.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{manager.dispose();}
