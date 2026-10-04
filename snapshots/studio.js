// Art-directed tableaux using the production world, assets, animation and VFX.
// This is a photographic fixture, not an organically played campaign save.
import * as Game from '../src/simulation/game.js';
import {rational} from '../src/simulation/money.js';
import {cropSpec} from '../src/simulation/rules.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {findInitialLocationAsync} from '../src/world/villages.js';
import {WorldScene} from '../src/rendering/scene.js';
import {json} from '../src/rendering/assets.js';
import {centerBoundaryPoint} from '../src/world/centers.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';

const shots=[
 {name:'01-sabana-gran-cosecha',biome:'sabana',culture:'mapungubwe',seed:712,time:125,plants:420,workers:32,eye:[5,20,32],aim:[-4,0,-5]},
 {name:'02-desierto-asedio-nocturno',biome:'desierto',culture:'saheliana',seed:712,time:345,plants:85,workers:10,raid:true,eye:[23,11,28],aim:[2,0,0]},
 {name:'03-gran-rio-cosecha',biome:'gran-rio',culture:'suajili',seed:712,time:140,plants:240,workers:24,eye:[17,9,-28],aim:[0,0,-8]},
 {name:'04-volcanes-ataque-multiple',biome:'volcanes',culture:'etiope',seed:712,time:230,plants:80,workers:12,raid:true,eye:[20,8,24],aim:[0,0,0]},
 {name:'05-gran-canon-trabajadores',biome:'gran-canon',culture:'musgum',seed:712,time:160,plants:200,workers:24,eye:[-28,18,32],aim:[5,0,0]},
 {name:'06-reserva-manglares',biome:'manglares',culture:'suajili',seed:712,time:140,plants:160,workers:20,eye:[17,12,-29],aim:[0,0,-5]},
 {name:'07-reserva-escudo-nocturno',biome:'desierto',culture:'saheliana',seed:712,time:345,plants:85,workers:10,raid:true,shield:true,eye:[19,8,23],aim:[1,0,0]},
 {name:'08-reserva-bestias-primer-plano',biome:'volcanes',culture:'etiope',seed:712,time:230,plants:80,workers:12,raid:true,eye:[13,5,19],aim:[2,0,3]},
 {name:'09-reserva-cosecha-a-pie-de-campo',biome:'gran-rio',culture:'suajili',seed:712,time:140,plants:240,workers:24,eye:[5,5,-24],aim:[-2,0,-12]},
 {name:'10-reserva-rio-entre-paredes',biome:'gran-canon',culture:'musgum',seed:712,time:160,plants:200,workers:24,eye:[-14,11,43],aim:[-6,0,-8]},
 {name:'11-detalle-rinoceronte',biome:'volcanes',culture:'etiope',seed:712,time:200,plants:80,workers:12,raid:true,portrait:'rhino',eye:[2,2.7,4.5],aim:[0,1.9,0]},
 {name:'12-detalle-leon',biome:'sabana',culture:'mapungubwe',seed:712,time:150,plants:85,workers:12,raid:true,portrait:'lion',eye:[1.6,2.4,4.3],aim:[0,1.7,0]},
 {name:'13-detalle-bufalo-hiena',biome:'desierto',culture:'saheliana',seed:712,time:160,plants:85,workers:10,raid:true,portrait:'buffalo',pair:true,eye:[2.5,2.8,6],aim:[1.5,1.7,0]},
 {name:'14-detalle-amara-cosechando',biome:'gran-rio',culture:'suajili',seed:712,time:140,plants:240,workers:24,portrait:'olderFemale',eye:[2,2,4.1],aim:[0,1.1,0]},
 {name:'15-detalle-kofi-regando',biome:'manglares',culture:'suajili',seed:712,time:140,plants:160,workers:20,portrait:'youngMale',eye:[2,2,-4.1],aim:[0,1.1,0]}
];
window.errors=[];addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
const index=Number(new URLSearchParams(location.search).get('shot')??0),shot=shots[index];
const pack=await json('/content/biome-'+BIOME_IDS[shot.biome]+'.json'),payload=(await json('/content/villages.json')).find(v=>v.id===(shot.culture==='saheliana'?'saheliano':shot.culture));
const state=Game.newGame(shot),nav=new Navigation(shot.seed,shot.biome,pack.profile);
const site=await findInitialLocationAsync(nav,payload);Object.assign(state.villages[0],site);state.suppressed.push(...site.suppress);state.ledger.balance=rational(1000000);nav.setState(state);
Game.placeStructure(state,'studio-center',site.center,nav);const c=state.structures[0];
const species=['girasol','maiz','algodon','mijo','sorgo','batata','yuca','platano'];
// Plant through normal placement validation, then stage the growth checkpoint.
for(let z=-19;z<=24&&state.plants.length<shot.plants;z+=1.65)for(let x=-24;x<=28&&state.plants.length<shot.plants;x+=1.65){
 try{Game.plant(state,'seed-'+state.plants.length,species[Math.floor((z+19)/5.1)%8],c.x+x,c.z+z,nav);}catch{}
}
for(const [i,p] of state.plants.entries()){p.growth=cropSpec(p.species).growth_seconds*(.76+(i%5)*.06);p.water.forEach(w=>w.status='manual');}
Game.openInitialHiring(state);Game.hire(state,'studio-hire',{olderMale:Math.ceil(shot.workers/4),olderFemale:Math.floor(shot.workers/4),youngMale:Math.ceil(shot.workers/4),youngFemale:Math.floor(shot.workers/4)});
state.tasks=[];
for(const [i,w] of state.workers.entries()){
 const p=state.plants[Math.floor(i*state.plants.length/state.workers.length)];
 const kind=i%3===0?'water':'harvest';Object.assign(w,{x:p.x,z:p.z+.7,heading:Math.PI,status:i%5===0?'carrying':'acting',path:null,actionRemaining:1.6+(i%3)*.2,carryPhase:i*.21,taskId:'photo-task-'+i});
 state.tasks.push({id:w.taskId,kind,targetId:p.id,workerId:w.id,status:'reserved'});
}
if(shot.raid){
 const kinds=['rhino','buffalo','lion','hyena','warthog'];
 state.raid={animals:[]};
 for(let i=0;i<15;i++){
  const species=kinds[i%5],angle=(i/15)*Math.PI*2,radius=i<5?5.5:9+(i%3)*2;
  const point=i<5?centerBoundaryPoint(c,-.5+i*.55,1.4,state):{x:c.x+Math.sin(angle)*radius,z:c.z+Math.cos(angle)*radius};const {x,z}=point;
  const clips=ANIMAL_ACTIONS.animals[species].clips,animation=Object.keys(clips).find(k=>!['Walking','Running','Idle'].includes(k));
  const duration=clips[animation].duration;
  state.raid.animals.push({id:'beast-'+i,species,x,z,heading:Math.atan2(c.x-x,c.z-z),hitsRemaining:5,status:i<5?'attacking':'entering',targetId:c.id,animation,attackDuration:duration,attackRemaining:duration*.4,attackId:'strike-'+i,hitApplied:false,motionPhase:i*.27,path:null});
 }
 c.hp=c.maxHp*.64;
 for(const [i,w] of state.workers.entries()){if(i%2===0)Object.assign(w,{status:'fleeing',running:true,runPhase:i*.17,x:c.x-8-i*.65,z:c.z+6+i*.4});}
}
state.time=shot.time;state.elapsed=shot.time;state.day=25;state.initialPreparation=false;state.tutorial.step='done';state.events=[];state.pauses=['photograph'];
if(shot.shield)state.spells.push({id:'photo-shield',kind:'shield',x:c.x,z:c.z,radius:7,remaining:18.5});
let subject=c;
if(shot.portrait){
 subject=state.raid?.animals.find(a=>a.species===shot.portrait)??state.workers.find(w=>w.profile===shot.portrait);
 if(subject.species){
  Object.assign(subject,{x:c.x+3,z:c.z+12,heading:.15,attackId:null,status:'entering',motionPhase:.18,attackRemaining:subject.attackDuration*.72});
  if(shot.pair){const partner=state.raid.animals.find(a=>a.species==='hyena');Object.assign(partner,{x:subject.x+3.4,z:subject.z+.2,heading:0,status:'entering',motionPhase:.18});}
 }else{
  Object.assign(subject,{x:c.x+12,z:c.z-22,heading:Math.PI,status:'acting',actionRemaining:shot.portrait==='olderFemale'?2.8:1.4});
  const task=state.tasks.find(t=>t.id===subject.taskId);task.kind=shot.portrait==='youngMale'?'water':'harvest';
  const plant=state.plants.find(p=>p.id===task.targetId);plant.x=subject.x;plant.z=subject.z-.8;
  // Clear the immediate photographic work area using the game's suppression state.
  if(shot.portrait==='youngMale'){
   const cx=Math.floor((subject.x+24)/48),cz=Math.floor((subject.z+24)/48);
   for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)for(const list of nav.chunk(cx+dx,cz+dz).instances)for(const prop of list)if(Math.hypot(prop.x-subject.x,prop.z-subject.z)<6)state.suppressed.push(prop.id);
  }
 }
}
nav.setState(state);
const world=new WorldScene(document.querySelector('canvas'),()=>{});world.onError=e=>errors.push(String(e));world.qualitySetting('alta');world.pixelRatioLimit=1;
await world.load(state,nav,payload);world.raidCamera.cancel();world.raidCamera.update=()=>{};world.controls.enableDamping=false;
// Portraits use a photographic aim height; the production renderer stays intact.
if(shot.portrait){world.camera.fov=shot.pair?36:30;world.camera.updateProjectionMatrix();world.updateCamera=()=>{world.controls.update();};}
window.studio={world,state,nav,shot,center:c};
window.compose=async(eye=shot.eye,aim=shot.aim)=>{
 const y=nav.field.surface(subject.x,subject.z);world.controls.target.set(subject.x+aim[0],y+aim[1],subject.z+aim[2]);world.camera.position.set(subject.x+eye[0],y+eye[1],subject.z+eye[2]);world.controls.update();world.render(0);await world.whenChunksReady();world.render(0);
};
await compose();
for(let i=0;i<1200;i++){await new Promise(r=>setTimeout(r,100));world.render(0);if(i>10&&world.mixers.size===state.workers.length+(state.raid?.animals.length??0))break;}if(world.mixers.size!==state.workers.length+(state.raid?.animals.length??0))throw Error('Actors still loading');
window.captureInfo=()=>({name:shot.name,biome:shot.biome,culture:shot.culture,seed:shot.seed,time:state.time,plants:state.plants.length,workers:state.workers.length,animals:state.raid?.animals.length??0,quality:world.quality,resolution:[world.canvas.width,world.canvas.height],far:world.camera.far,chunks:world.chunks.size,eye:world.camera.position.toArray(),target:world.controls.target.toArray(),errors});
window.ready=true;



