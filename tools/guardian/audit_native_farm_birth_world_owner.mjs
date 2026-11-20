import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {nativeFarmArrivalRouteFixture} from '../../tests/helpers/native-farm-arrival-route.js';
import {createPlant} from '../../src/simulation/crops.js';
import {rational} from '../../src/simulation/money.js';
import {serializeConfirmedState} from '../../src/simulation/confirmed-live-state.js';
import {createNativeAuditCapture} from './native-audit-capture.mjs';
import {centerServicePoint} from '../../src/world/centers.js';
import {cropSpec} from '../../src/simulation/rules.js';

const output=process.env.OUTPUT??'.cache/native-farm-birth-gpu.json',sha=value=>createHash('sha256').update(value).digest('hex'),modulePath=process.env.PLAYWRIGHT_MODULE??path.resolve('.cache/microevent-qa/node_modules/playwright-core');
const {chromium}=createRequire(import.meta.url)(modulePath);
let input;const scenario=process.env.QA_NATIVE_BIRTH_SCENARIO??'birth';if(!['birth','cancel-before-home','cancel-after-home','cancel-before-task','cancel-after-task'].includes(scenario))throw Error('Unknown birth scenario');const newbornCount=Number(process.env.QA_NATIVE_BIRTH_COUNT??1),targetCenter='structure-900097';if(![1,2].includes(newbornCount))throw Error('Expected one or two births');
// Source-only semantic checkpoint. Dispose its world before starting the actual
// browser authority. No old permission/handle enters that authority.
const f=nativeFarmArrivalRouteFixture({peer:false,profile:'youngFemale',configureState(s,c){
 const w=s.workers[0],crop=createPlant('plant-900098','mijo',c.target.x+5,c.target.z,w.centerId);for(const water of crop.water)water.status='manual';s.plants.push(crop);s.hiringPaidDay=s.day;s.hiringSelection={youngFemale:1};s.ledger.balance=rational(100000);s.villages.find(v=>v.id===w.villageId).entry={x:w.x,z:w.z+6};
 if(scenario!=='birth')s.time=240;
 if(newbornCount===2||scenario!=='birth'){const original=s.structures.find(v=>v.id===w.centerId),center={...original,id:targetCenter,z:original.z+16};s.structures.push(center);const point=centerServicePoint(center,s,.8),plant=createPlant('plant-900099','mijo',point.x+5,point.z,center.id);for(const water of plant.water)water.status='manual';if(scenario.endsWith('task'))plant.growth=cropSpec('mijo').growth_seconds-8;s.plants.push(plant);}
}});
try{const center=f.point(0,0);input={saved:JSON.parse(serializeConfirmedState(f.state)),chunkKeys:Array.from({length:9},(_,i)=>`${i%3-1},${Math.floor(i/3)-1}`),center,ground:f.session.core.surface(center.x,center.z),oldAuthorityEpoch:f.planner.authorityEpoch,newbornProfile:process.env.QA_NATIVE_NEWBORN_PROFILE??(scenario==='birth'||scenario.endsWith('task')?'youngFemale':'olderMale'),newbornCount,scenario,...(newbornCount===2||scenario!=='birth'?{hiringCenterId:targetCenter}:{})};}finally{f.close();}
fs.writeFileSync(output.replace(/\.json$/,'.checkpoint.json'),JSON.stringify(input,null,2)+'\n');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),errors=[],consoleErrors=[],httpFailures=[],requestFailures=[],overrides=[];let timer,traceSession,traceComplete,traceClockAnchor;
try{
 timer=setTimeout(()=>browser.close(),150000);
 if(process.env.QA_NATIVE_TRACE==='true'){
  traceSession=await browser.newBrowserCDPSession();traceComplete=new Promise(resolve=>traceSession.once('Tracing.tracingComplete',resolve));
  await traceSession.send('Tracing.start',{categories:process.env.QA_NATIVE_TRACE_CATEGORIES??'toplevel,blink,blink.user_timing,devtools.timeline,v8.execute,gpu,viz,cc',transferMode:'ReturnAsStream'});
 }
 page.on('pageerror',e=>errors.push(String(e.stack??e)));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});page.on('response',r=>{if(r.status()>=400)httpFailures.push({url:r.url(),status:r.status()});});page.on('requestfailed',r=>requestFailures.push({url:r.url(),failure:r.failure()}));
 // QA metadata only on real, checksum-verified bank/route objects. Neither
 // geometry/data nor shader ownership is changed by these served annotations.
 for(const [file,transform]of [
  ['baked-worker-walk-catalog.js',body=>{const p=/return clip\s*===\s*['"]Worker_GetUp['"]\s*\?[\s\S]*?;/g;if([...body.matchAll(p)].length!==1)throw Error('Expected one verified bake return');return body.replace(p,value=>'const qaOwnedBake='+value.slice(7,-1)+';globalThis.__auditBirthTextureRefs?.push(new WeakRef(qaOwnedBake.texture));globalThis.__auditTextureOrigins?.set(qaOwnedBake.texture,{namespace:"baked-worker-bank",profile:qaOwnedBake.meta.species,clip:qaOwnedBake.meta.clip,sha256:qaOwnedBake.meta.sha256,texture:qaOwnedBake.texture.id,width:qaOwnedBake.texture.image.width,height:qaOwnedBake.texture.image.height});return qaOwnedBake;');}],
  ['native-gpu-motion.js',body=>{const p=/const texture\s*=\s*new DataTexture\([^;]+\);/g;if([...body.matchAll(p)].length!==1)throw Error('Expected one motion texture allocation');return body.replace(p,value=>value+'globalThis.__auditBirthTextureRefs?.push(new WeakRef(texture));const qaRoute=table.nativeFarmArrival??table.nativeStroll??table.nativeHome;if(qaRoute){texture.name="qa-native-motion:"+qaRoute.actorId;globalThis.__auditTextureOrigins?.set(texture,{namespace:"native-motion",actorId:qaRoute.actorId,texture:texture.id});}');}],
  ['webgpu-footstep-playback.js',body=>{const p=/const result\s*=\s*new DataTexture\([^;]+\);/g;if([...body.matchAll(p)].length!==1)throw Error('Expected one footstep texture constructor');return body.replace(p,value=>value+'globalThis.__auditBirthTextureRefs?.push(new WeakRef(result));globalThis.__auditTextureOrigins?.set(result,{namespace:"footstep-samples",texture:result.id,width:result.image.width,height:result.image.height});');}],
 ])await page.context().route('**/src/rendering/'+file+'*',async route=>{const response=await route.fetch(),body=await response.text(),annotated=transform(body);overrides.push({file,url:route.request().url(),originalSha256:sha(body),annotatedSha256:sha(annotated),scope:'QA object name/origin only'});await route.fulfill({response,body:annotated});});
 const capture=createNativeAuditCapture(page,{output,mode:process.env.QA_NATIVE_CAPTURE_MODE??'visual'});await page.exposeFunction('captureNativeFarmBirth',label=>capture.checkpoint(label));
 await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5218')+'/tests/browser/native-farm-birth-world-owner.html');await page.waitForFunction(()=>typeof window.runNativeFarmBirthWorldOwner==='function');
 if(traceSession)traceClockAnchor=await page.evaluate(()=>{const mark=performance.mark('native-farm-birth-trace-origin');return {name:mark.name,absoluteMs:performance.timeOrigin+mark.startTime};});
 const result=await page.evaluate(input=>window.runNativeFarmBirthWorldOwner(input),input);
 fs.writeFileSync(output,JSON.stringify({result,sourceCheckpoint:{sha256:sha(JSON.stringify(input)),path:output.replace(/\.json$/,'.checkpoint.json')},resourceOriginOverrides:overrides,capture:capture.evidence(),errors,consoleErrors,httpFailures,requestFailures,...(traceClockAnchor?{traceClockAnchor}: {})},null,2)+'\n');
 if(errors.length||consoleErrors.length||httpFailures.length||requestFailures.length||result.errors?.length||result.final.gpuErrors||!result.drained||result.disposal?.gpu?.disposed!==true||result.disposal?.sourceAliveUntilGraphicalClose!==true||/swiftshader|software/i.test(JSON.stringify(result.adapter))||!result.adapter.vendor)throw Error('Ordinary Farm birth hardware validation failed; see '+output);
 console.log(JSON.stringify({output,profile:result.source.newbornProfile,adapter:result.adapter,retained:result.resourceIdentity.retainedGeometryAndBankIds.length,prepared:result.resourceChanges.prepared,afterReady:result.resourceChanges.afterReady,prep:result.preparationBlock.cadence,commit:result.block.cadence,drained:result.drained}));
}catch(error){
 let failure;try{failure=await page.evaluate(()=>window.nativeFarmBirthFailureReceipt??null);}catch(e){failure={inspectionError:String(e)};}
 fs.writeFileSync(output.replace(/\.json$/,'.failure.json'),JSON.stringify({error:String(error.stack??error),failure,resourceOriginOverrides:overrides,errors,consoleErrors,httpFailures,requestFailures,...(traceClockAnchor?{traceClockAnchor}: {})},null,2)+'\n');throw error;
}finally{
 clearTimeout(timer);
 try{if(traceSession){await traceSession.send('Tracing.end');const {stream,...completion}=await traceComplete;if(!stream)throw Error('Native birth trace has no stream');const chunks=[];try{for(;;){const item=await traceSession.send('IO.read',{handle:stream});chunks.push(Buffer.from(item.data,item.base64Encoded?'base64':'utf8'));if(item.eof)break;}}finally{await traceSession.send('IO.close',{handle:stream});}fs.writeFileSync(output.replace(/\.json$/,'.trace.json'),Buffer.concat(chunks));fs.writeFileSync(output.replace(/\.json$/,'.trace-complete.json'),JSON.stringify(completion,null,2)+'\n');if(completion.dataLossOccurred!==false)throw Error('Native birth trace did not establish loss-free completion');}}
 finally{await browser.close();}
}
