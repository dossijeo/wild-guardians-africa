import {writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {nativeActionSave} from '../../tests/helpers/native-task-action-restoration.js';
import {createPlant} from '../../src/simulation/crops.js';

const kind=process.env.QA_NATIVE_WATERING_KIND??'water';
if(!['initial','water'].includes(kind))throw Error('Expected initial or water');
const output=process.env.OUTPUT??`.cache/native-watering-${kind}-hardware.json`;
const modulePath=process.env.PLAYWRIGHT_MODULE??path.resolve('.cache/microevent-qa/node_modules/playwright-core');
const {chromium}=createRequire(import.meta.url)(modulePath);
const {saved}=nativeActionSave({kind,progress:.6}),worker=saved.workers[0];
saved.workers=[worker];saved.tasks=saved.tasks.filter(task=>task.workerId===worker.id);
const plant=saved.plants.find(plant=>plant.id===saved.tasks[0].targetId);
Object.assign(plant,createPlant(plant.id,plant.species,plant.x,plant.z,plant.centerId));
if(kind==='water'){
 plant.water[0].status='manual';plant.water[1].status='due';plant.growth=plant.water[1].at;
}
const next=createPlant(`plant-${saved.nextId++}`,'mijo',worker.x-4,worker.z,worker.centerId);
next.growth=999999;for(const slot of next.water)slot.status='manual';saved.plants=[plant,next];
const center={x:worker.x,z:worker.z},input={saved,kind,targetId:plant.id,nextTargetId:next.id,center,ground:worker.y??0,chunkKeys:Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`)};
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
 writeFileSync(output,JSON.stringify({result,errors},null,2)+'\n');
 console.log(JSON.stringify({output,kind,adapter:result.adapter,bodyId:result.idle.reference.bodyId,draws:result.draws}));
}catch(error){
 const failure=await page.evaluate(()=>window.nativeWateringIdleFailure??null).catch(error=>String(error));
 writeFileSync(output.replace(/\.json$/,'.failure.json'),JSON.stringify({error:String(error.stack??error),failure,errors},null,2)+'\n');throw error;
}finally{clearTimeout(timeout);await browser.close();}
