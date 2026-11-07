import {createSimulation} from './mobility-worker-simulation-core.js';
import {createWorkerBeastPhysics} from '../../src/simulation/worker-beast-physics.js';
import {applyGuardianAttack} from '../../src/simulation/guardian-combat.js';
import {serializeConfirmedState,confirmedStateSaveAvailable} from '../../src/simulation/confirmed-live-state.js';
export async function runFallbackPhysics({sampleEvery=1}={}){
 const chunks=[];for(let z=-1;z<=2;z++)for(let x=0;x<=5;x++)chunks.push(`${x},${z}`);
 const simulation=await createSimulation({mangrove:true,chunkKeys:chunks}),{game,nav}=simulation.diagnosticWorld();
 const first=game.raid.animals.find(a=>a.species==='hyena'&&!['gone','retreating'].includes(a.status)),animals=[first,...game.raid.animals.filter(a=>a.id!==first?.id&&['hyena','lion','warthog','buffalo','rhino'].includes(a.species)&&!['gone','retreating'].includes(a.status)).slice(0,3)];if(animals.length!==4||!first)throw Error('Missing animals');
 for(let i=1;i<animals.length;i++){animals[i].x=first.x+1.4*(i%2);animals[i].z=first.z+1.4*Math.floor(i/2);animals[i].path=null;}
 const ids=animals.map(a=>a.id),driver=await createWorkerBeastPhysics(game,nav,{actorIds:ids});
 try{
  for(const [i,animal] of animals.entries()){const ground=nav.field.surface(animal.x,animal.z),contact={x:animal.x,y:ground+animal.radius,z:animal.z},origin={x:animal.x+(i%2?3:-3),y:contact.y,z:animal.z};applyGuardianAttack(game,animal,{nav,origin,contact,ground});}
  let physical=0,baked=0;const frames=[];
  for(let i=0;i<500;i++){
   simulation.advanceTick(.05);physical=Math.max(physical,driver.manager.entries.size);baked=Math.max(baked,driver.manager.baked.entries.size);serializeConfirmedState(game);if((driver.manager.entries.size||driver.manager.baked.entries.size)&&confirmedStateSaveAvailable(game))throw Error('Active fallback advertised as restorable');
   frames.push({poses:i%sampleEvery===0?driver.poses():null,animals:animals.map(a=>({x:a.x,z:a.z,down:a.magicDown??null}))});
   if(physical&&baked&&!driver.manager.entries.size&&!driver.manager.baked.entries.size)break;
  }
  if(physical!==3||!baked||driver.manager.entries.size||driver.manager.baked.entries.size)throw Error('Fallback did not complete '+JSON.stringify({physical,baked,active:driver.manager.entries.size,bakedActive:driver.manager.baked.entries.size}));
  return {ids,species:animals.map(a=>a.species),physical,baked,frames};
 }finally{driver.dispose();simulation.dispose();}
}
if(typeof WorkerGlobalScope!=='undefined'&&globalThis instanceof WorkerGlobalScope)self.onmessage=async()=>{try{postMessage({result:await runFallbackPhysics()});}catch(error){postMessage({error:String(error?.stack??error)});}};
