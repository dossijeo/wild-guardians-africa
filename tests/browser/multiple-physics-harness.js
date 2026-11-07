import {createSimulation} from './mobility-worker-simulation-core.js';
import {createWorkerBeastPhysics} from '../../src/simulation/worker-beast-physics.js';
import {applyGuardianAttack} from '../../src/simulation/guardian-combat.js';

export async function runMultiplePhysics(){
 const chunks=[];for(let z=-1;z<=2;z++)for(let x=0;x<=5;x++)chunks.push(`${x},${z}`);
 const simulation=await createSimulation({mangrove:true,chunkKeys:chunks}),{game,nav}=simulation.diagnosticWorld();
 const first=game.raid.animals.find(a=>a.species==='hyena'&&!['gone','retreating'].includes(a.status)),second=game.raid.animals.find(a=>a.id!==first?.id&&['hyena','lion','warthog','buffalo','rhino'].includes(a.species)&&!['gone','retreating'].includes(a.status));if(!first||!second)throw Error('Missing animals');
 second.x=first.x+1.2;second.z=first.z;second.path=null;const ids=[first.id,second.id],driver=await createWorkerBeastPhysics(game,nav,{actorIds:ids});
 try{
  for(const [i,animal] of [first,second].entries()){const ground=nav.field.surface(animal.x,animal.z),contact={x:animal.x,y:ground+animal.radius,z:animal.z},origin={x:animal.x+(i?3:-3),y:contact.y,z:animal.z};applyGuardianAttack(game,animal,{nav,origin,contact,ground});}
  let overlap=0,contacts=0,activeFirst=0,activeSecond=0;const frames=[];
  for(let i=0;i<350;i++){
   simulation.advanceTick(.05);const poses=driver.poses(),a=driver.manager.entries.get(ids[0])?.actor,b=driver.manager.entries.get(ids[1])?.actor,solver=driver.manager.solver;
   if(a)activeFirst++;if(b)activeSecond++;if(a&&b){overlap++;for(const partA of a.parts)for(const partB of b.parts)solver.world.contactPair(partA.body.collider(0),partB.body.collider(0),manifold=>{if(manifold.numSolverContacts()>0)contacts++;});}
   frames.push({poses,animals:ids.map(id=>{const animal=game.raid.animals.find(a=>a.id===id);return {x:animal.x,z:animal.z,phase:animal.magicDown?.phase??null};})});
   if(overlap&&!a&&!b)break;
  }
  if(!overlap||!contacts||driver.manager.entries.size)throw Error('Simultaneous contact did not complete '+JSON.stringify({overlap,contacts,activeFirst,activeSecond,active:driver.manager.entries.size}));
  return {ids,species:[first.species,second.species],overlap,contacts,activeFirst,activeSecond,frames};
 }finally{driver.dispose();simulation.dispose();}
}
if(typeof WorkerGlobalScope!=='undefined'&&globalThis instanceof WorkerGlobalScope)self.onmessage=async()=>{try{postMessage({result:await runMultiplePhysics()});}catch(error){postMessage({error:String(error?.stack??error)});}};
