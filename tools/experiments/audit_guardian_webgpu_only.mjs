import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage({viewport:{width:800,height:600}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;window.__webglRequests=0;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(/^webgl/i.test(kind)){window.__webglRequests++;throw Error('WebGL forbidden in WebGPU guardian test');}return original.call(this,kind,...args);};});
 await page.route('**/guardian-webgpu-only*',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><button id="start">Start</button><div id="guardian"></div>'}));
 await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5175')+'/guardian-webgpu-only?qa-guardian-gpu-diagnostics');
 await page.evaluate(async()=>{
  const [{NativeGuardian},{SpiritVoice},{assetUrl}]=await Promise.all([import('/src/ui/guardian.js'),import('/src/audio/spirit-voice.js'),import('/src/rendering/asset-url.js')]);
  window.WildGuardiansLanguage={getLanguage:()=> 'es',translate:text=>text};const failures=[],voice=new SpiritVoice({url:assetUrl,volume:()=>1}),actor=new NativeGuardian(document.querySelector('#guardian'),error=>failures.push(error.message),()=>{},voice);await actor.ready;
  if(actor.mesh?.backend!=='webgpu')throw Error('WebGPU Worker not active: '+failures.join('; '));
  document.querySelector('#start').onclick=()=>actor.show({key:'voice-test',text:'Estas tierras me conocen. Soy el Espíritu que las guarda. Al anochecer, una maldición agita a los animales. Echa raíces junto al poblado: levanta un centro, siembra; tu comunidad cuidará los cultivos.',gesture:'speak'});
  let running=true;function frame(){if(!running)return;actor.update();requestAnimationFrame(frame);}requestAnimationFrame(frame);window.__guardianTest={actor,voice,failures,stop:()=>{running=false;actor.dispose();}};
 });
 await page.locator('#start').click();try{await page.waitForFunction(()=>{const {actor,voice}=window.__guardianTest;return voice.status==='playing'&&voice.audio?.currentTime>.3&&actor.mesh?.diagnostics?.cue==='ES_01';},null,{timeout:30000});}catch(error){const state=await page.evaluate(()=>{const {actor,voice,failures}=window.__guardianTest;return {status:voice.status,failure:voice.failure,time:voice.audio?.currentTime,record:actor.voiceRecord,cue:actor.mesh?.diagnostics?.cue,faceError:actor.mesh?.face?.error,backend:actor.mesh?.backend,failures};});throw Error('Guardian audio test timed out: '+JSON.stringify(state),{cause:error});}
 const first=await page.evaluate(()=>{const {actor,voice,failures}=window.__guardianTest;return {time:voice.audio.currentTime,status:voice.status,cue:actor.mesh.diagnostics.cue,weights:actor.mesh.diagnostics.weights,backend:actor.mesh.backend,failures:[...failures],pipelines:actor.mesh.diagnostics.pipelineCalls,webglRequests:window.__webglRequests};});
 await page.waitForTimeout(1000);const second=await page.evaluate(()=>{const {actor,voice,failures}=window.__guardianTest;return {time:voice.audio.currentTime,status:voice.status,cue:actor.mesh.diagnostics.cue,weights:actor.mesh.diagnostics.weights,backend:actor.mesh.backend,failures:[...failures],pipelines:actor.mesh.diagnostics.pipelineCalls,webglRequests:window.__webglRequests};});
 if(first.backend!=='webgpu'||second.backend!=='webgpu'||first.webglRequests||second.webglRequests||first.failures.length||second.failures.length||errors.length||second.time<=first.time||!Object.keys(first.weights).some(k=>k.startsWith('viseme_')))throw Error(JSON.stringify({first,second,errors}));
 const report={first,second,errors,scope:'Isolated NativeGuardian UI with real ES_01 audio, real browser media clock and Worker WebGPU. Main-thread WebGL contexts are forbidden; the Worker separately forbids them. Not the full game or a performance benchmark.'};
 if(process.env.QA_OUTPUT)await writeFile(process.env.QA_OUTPUT,JSON.stringify(report,null,2));else console.log(JSON.stringify(report));await page.evaluate(()=>window.__guardianTest.stop());
}finally{await browser.close();}
