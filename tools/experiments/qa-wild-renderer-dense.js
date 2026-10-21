import {createPlant} from '/src/simulation/crops.js';
import {cropSpec} from '/src/simulation/rules.js';
// Deterministic renderer-only stress fixture, NOT a simulated late campaign.
export async function installDenseFixture(w){
 const s=w.state,x=w.controls.target.x,z=w.controls.target.z;
 s.tutorial.step='done';
 const species=['maiz','algodon','girasol','platano','sorgo','mijo','yuca','batata'];
 s.plants=Array.from({length:300},(_,i)=>({id:`wr-crop-${i}`,species:species[i%8],alive:true,growth:cropSpec(species[i%8]).growth_seconds*(i%3===0?.48:1),x:x+(i%20-10)*1.2,z:z+(Math.floor(i/20)-7)*1.2}));
 const profiles=['olderMale','olderFemale','youngMale','youngFemale'];
 for(const p of s.plants){p.water=createPlant(p.id,p.species,p.x,p.z,null).water;for(const water of p.water)water.status='manual';}
 s.workers=Array.from({length:24},(_,i)=>({id:`wr-worker-${i}`,profile:profiles[i%4],x:x+(i%8-4)*2,z:z+11+Math.floor(i/8)*2,status:'idle',path:[],taskId:null}));
 s.raid={id:'wr-raid',encounters:[],reservations:{},daytime:true,animals:Array.from({length:16},(_,i)=>({id:`wr-animal-${i}`,species:['warthog','hyena','buffalo','lion','rhino'][i%5],x:x+(i%8-4)*3,z:z-12-Math.floor(i/8)*3,status:'idle',hitsRemaining:4,path:[],heading:0,radius:.6,exit:{x:x+(i%8-4)*3,z:z-12-Math.floor(i/8)*3}}))};
 const center=s.structures.find(e=>e.kind==='center')??s.villages[0];
 for(let i=0;i<3;i++)s.structures.push({...center,id:`wr-building-${i}`,kind:'center',hp:100,maxHp:100,status:'intact',collapseRemaining:0,culture:'mapungubwe',x:x-19+i*17,z:z-24});
 for(let i=0;i<40;i++)s.structures.push({id:`wr-wall-${i}`,kind:'wall',material:['empalizada','adobe','piedra'][i%3],gate:false,x:x-20+(i%20)*2,z:z+(i<20?-19:19),yaw:0,hp:100,maxHp:100,status:'intact',collapseRemaining:0});
 w.sync(0);await Promise.all([...w.assets.cache.values()]);
 for(let i=0;i<600&&!w.actorsReady();i++){await new Promise(requestAnimationFrame);w.render(0);}
 if(!w.actorsReady())throw Error('Dense fixture actors did not finish loading');
 w.qaDenseFixture={plants:300,workers:24,animals:16,addedBuildings:3,addedWalls:40};
}
