import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE??'playwright'),sharp=require('sharp');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:800,height:500},deviceScaleFactor:1});
 await page.route('**/guardian-worker-compare',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><style>body{margin:0;background:#777}canvas{width:400px;height:500px}</style><canvas id="a"></canvas><canvas id="b"></canvas>'}));
 await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5175')+'/guardian-worker-compare');
 await page.evaluate(async()=>{
  const [{Guardian3D},{Guardian3DWorkerClient}]=await Promise.all([import('/src/ui/guardian-3d.js'),import('/src/ui/guardian-3d-worker-client.js')]);
  const local=new Guardian3D(document.querySelector('#a')),worker=new Guardian3DWorkerClient(document.querySelector('#b'),{diagnostics:true});await Promise.all([local.ready,worker.ready]);
  const record={id:'ES_01',path:'content/spirit-voices/es_01.ogg'};await local.setRecord(record);worker.setRecord(record);
  const frame={time:3.1,audio:{currentTime:1,ended:false},gesture:'speak',reduced:false};
  for(let i=0;i<100;i++){worker.draw(frame);await new Promise(r=>setTimeout(r,50));if(worker.diagnostics?.cue==='ES_01'&&!worker.inflight)break;}
  if(worker.diagnostics?.cue!=='ES_01'||!local.face.data)throw Error('Lip sync cue unavailable');
  window.__guardians={local,worker};
 });
 const scenarios=[{name:'blink_speech',frame:{time:3.1,audio:{currentTime:1,ended:false},gesture:'speak',reduced:false}},{name:'idle',frame:{time:1,audio:null,gesture:'idle',reduced:false}},{name:'point',frame:{time:2,audio:{currentTime:2.5,ended:false},gesture:'curious',reduced:false},target:[.3,.1,0]},{name:'reduced',frame:{time:7.8,audio:null,gesture:'warning',reduced:true}}],samples=[];
 for(const scenario of scenarios){
  const result=await page.evaluate(async scenario=>{const {local,worker}=window.__guardians;local.pointTarget=scenario.target?local.target.clone().fromArray(scenario.target):null;worker.pointTarget=scenario.target?local.target.clone().fromArray(scenario.target):null;local.draw(scenario.frame);worker.draw(scenario.frame);while(worker.inflight)await new Promise(r=>setTimeout(r,10));const weights={};for(const mesh of local.face.meshes)for(const [key,index] of Object.entries(mesh.morphTargetDictionary))if(key.startsWith('viseme_')||key.startsWith('blink_'))weights[key]=Math.max(weights[key]??0,mesh.morphTargetInfluences[index]);return {localWeights:weights,workerWeights:worker.diagnostics.weights,localDraws:local.metrics.drawCalls,workerDraws:worker.metrics.drawCalls,faceError:worker.face.error};},scenario);
  const a=await page.locator('#a').screenshot(),b=await page.locator('#b').screenshot();
  const [left,right]=await Promise.all([a,b].map(bytes=>sharp(bytes).removeAlpha().raw().toBuffer()));let sum=0,max=0;for(let i=0;i<left.length;i++){const d=Math.abs(left[i]-right[i]);sum+=d;max=Math.max(max,d);}
  const keys=Object.keys(result.localWeights);let weightMax=0;for(const key of keys)weightMax=Math.max(weightMax,Math.abs(result.localWeights[key]-result.workerWeights[key]));
  if(!result.localDraws||!result.workerDraws||result.faceError||weightMax>1e-6||scenario.name==='blink_speech'&&(!keys.some(key=>key.startsWith('viseme_')&&result.localWeights[key]>0)||!keys.some(key=>key.startsWith('blink_')&&result.localWeights[key]>0)))throw Error('Guardian Worker parity failed: '+JSON.stringify(result));
  samples.push({name:scenario.name,...result,weightMax,pixelMean:sum/left.length,pixelMax:max});
  if(process.env.QA_SCREENSHOT_PREFIX&&scenario.name==='blink_speech'){await writeFile(process.env.QA_SCREENSHOT_PREFIX+'-main.png',a);await writeFile(process.env.QA_SCREENSHOT_PREFIX+'-worker.png',b);}
 }
 const summary={samples,scope:'Four fixed poses including pointing and reduced motion; simulated narration clock and compositor captures, no full tutorial or timing comparison.'};
 if(process.env.QA_OUTPUT)await writeFile(process.env.QA_OUTPUT,JSON.stringify(summary,null,2));else console.log(JSON.stringify(summary));
 await page.evaluate(()=>{window.__guardians.local.dispose();window.__guardians.worker.dispose();});
}finally{await browser.close();}
