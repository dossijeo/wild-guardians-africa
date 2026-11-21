import {writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {nativeActionSave} from '../../tests/helpers/native-task-action-restoration.js';
import {createPlant} from '../../src/simulation/crops.js';
import {nativeFarmArrivalRouteFixture} from '../../tests/helpers/native-farm-arrival-route.js';
import {rational} from '../../src/simulation/money.js';
import {PROFILES} from '../../src/simulation/workforce.js';

const kind=process.env.QA_NATIVE_WATERING_KIND??'water',origin=process.env.QA_NATIVE_WATERING_ORIGIN??'restored';
const profile=process.env.QA_NATIVE_WORKER_PROFILE,repairTarget=process.env.QA_NATIVE_REPAIR_TARGET??'center';
if(!['restored','fresh'].includes(origin))throw Error('Expected restored or fresh');
if(!['initial','water','repair'].includes(kind)||kind==='repair'&&origin!=='fresh')throw Error('Expected initial, water, or fresh repair');
if(!['center','wall'].includes(repairTarget)||repairTarget==='wall'&&kind!=='repair')throw Error('Unsupported repair target');
if(profile!==undefined&&(origin!=='fresh'||!PROFILES.some(item=>item.id===profile)))throw Error('Expected a supported profile for a fresh command');
const output=process.env.OUTPUT??`.cache/native-watering-${kind}-${origin}${repairTarget==='wall'?'-wall':''}${profile?`-${profile}`:''}-hardware.json`;
const modulePath=process.env.PLAYWRIGHT_MODULE??path.resolve('.cache/microevent-qa/node_modules/playwright-core');
const {chromium}=createRequire(import.meta.url)(modulePath);
function restoredInput(){
 const {saved}=nativeActionSave({kind,progress:.6}),worker=saved.workers[0];
 saved.workers=[worker];saved.tasks=saved.tasks.filter(task=>task.workerId===worker.id);
 const plant=saved.plants.find(plant=>plant.id===saved.tasks[0].targetId);
 Object.assign(plant,createPlant(plant.id,plant.species,plant.x,plant.z,plant.centerId));
 if(kind==='water'){
  plant.water[0].status='manual';plant.water[1].status='due';plant.growth=plant.water[1].at;
 }
 const next=createPlant(`plant-${saved.nextId++}`,'mijo',worker.x-4,worker.z,worker.centerId);
 next.growth=999999;for(const slot of next.water)slot.status='manual';saved.plants=[plant,next];
 const center={x:worker.x,z:worker.z};return {saved,kind,origin,targetId:plant.id,nextTargetId:next.id,center,ground:worker.y??0,chunkKeys:Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`)};
}
function freshInput(){
 const f=nativeFarmArrivalRouteFixture({peer:false,profile});
 try{
  const saved=structuredClone(f.state),worker=saved.workers[0],center={x:worker.x,z:worker.z};
  const point=f.point(-6,0);
  saved.ledger.balance=rational(100000);
  const resident=f.point(8,0),anchor=createPlant(`plant-${saved.nextId++}`,'mijo',resident.x,resident.z,worker.centerId);
  for(const slot of anchor.water)slot.status='manual';
  saved.plants.push(anchor);
  let targetId=null;
  if(kind==='repair'){
   const building=repairTarget==='wall'?
    saved.structures.find(item=>item.kind==='wall'&&item.material==='zarzas'&&item.status==='intact'&&!item.gate):
    saved.structures.find(item=>item.id===worker.centerId);
   if(repairTarget==='wall')Object.assign(building,f.point(6,4));
   building.hp=Math.floor(building.maxHp/2);targetId=building.id;
  }
  if(kind==='water'){
   targetId=`plant-${saved.nextId++}`;
   const plant=createPlant(targetId,'mijo',point.x,point.z,worker.centerId);
   plant.water[0].status='manual';plant.growth=plant.water[1].at-20;
   saved.plants.push(plant);
  }
  return {saved,kind,origin,targetId,nextTargetId:null,placement:point,center,ground:f.session.core.surface(center.x,center.z),chunkKeys:Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`)};
 }finally{f.close();}
}
const input=origin==='fresh'?freshInput():restoredInput();
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),errors=[];
const timeout=setTimeout(()=>browser.close(),160000);
page.on('pageerror',error=>errors.push(String(error.stack??error)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
try{
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5218'}/tests/browser/native-farm-birth-world-owner.html`);
 const result=await page.evaluate(async input=>{
  const {auditNativeWateringIdleWorldOwner}=await import('/tests/browser/native-watering-idle-world-owner.js');
  return auditNativeWateringIdleWorldOwner(input);
 },input);
 if(errors.length)throw Error(JSON.stringify(errors));
 if(result.atEffect.profile!==input.saved.workers[0].profile)throw Error('Unexpected worker profile at the consequence');
 writeFileSync(output,JSON.stringify({result,errors},null,2)+'\n');
 console.log(JSON.stringify({output,kind,origin,profile:result.atEffect.profile,adapter:result.adapter,bodyId:result.idle.reference.bodyId,draws:result.draws,...(kind==='repair'?{payment:result.sourceAfter.events[0].repair}:{})}));
}catch(error){
 const failure=await page.evaluate(()=>window.nativeWateringIdleFailure??null).catch(error=>String(error));
 writeFileSync(output.replace(/\.json$/,'.failure.json'),JSON.stringify({error:String(error.stack??error),failure,errors},null,2)+'\n');throw error;
}finally{clearTimeout(timeout);await browser.close();}
