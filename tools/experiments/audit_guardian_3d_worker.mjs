import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE??'playwright'),sharp=require('sharp');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:800,height:500},deviceScaleFactor:1});
 await page.route('**/guardian-worker-compare',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><style>body{margin:0;background:#777}canvas{width:400px;height:500px}</style><canvas id="a"></canvas><canvas id="b"></canvas>'}));
 await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5175')+'/guardian-worker-compare');
 const result=await page.evaluate(async()=>{
  const [{Guardian3D},{Guardian3DWorkerClient}]=await Promise.all([import('/src/ui/guardian-3d.js'),import('/src/ui/guardian-3d-worker-client.js')]);
  const local=new Guardian3D(document.querySelector('#a')),worker=new Guardian3DWorkerClient(document.querySelector('#b'),{diagnostics:true});await Promise.all([local.ready,worker.ready]);
  const record={id:'ES_01',path:'content/spirit-voices/es_01.ogg'};await local.setRecord(record);worker.setRecord(record);
  const frame={time:3.1,audio:{currentTime:1,ended:false},gesture:'speak',reduced:false};
  for(let i=0;i<100;i++){worker.draw(frame);await new Promise(r=>setTimeout(r,50));if(worker.diagnostics?.cue==='ES_01'&&!worker.inflight)break;}
  if(worker.diagnostics?.cue!=='ES_01'||!local.face.data)throw Error('Lip sync cue unavailable');
  local.draw(frame);worker.draw(frame);while(worker.inflight)await new Promise(r=>setTimeout(r,10));
  const weights={};for(const mesh of local.face.meshes)for(const [key,index] of Object.entries(mesh.morphTargetDictionary))if(key.startsWith('viseme_')||key.startsWith('blink_'))weights[key]=Math.max(weights[key]??0,mesh.morphTargetInfluences[index]);
  window.__guardians={local,worker};return {localWeights:weights,workerWeights:worker.diagnostics.weights,localDraws:local.metrics.drawCalls,workerDraws:worker.metrics.drawCalls,faceError:worker.face.error};
 });
 const a=await page.locator('#a').screenshot(),b=await page.locator('#b').screenshot();
 const [left,right]=await Promise.all([a,b].map(bytes=>sharp(bytes).removeAlpha().raw().toBuffer()));let sum=0,max=0;for(let i=0;i<left.length;i++){const d=Math.abs(left[i]-right[i]);sum+=d;max=Math.max(max,d);}
 const keys=Object.keys(result.localWeights);let weightMax=0;for(const key of keys)weightMax=Math.max(weightMax,Math.abs(result.localWeights[key]-result.workerWeights[key]));
 if(!result.localDraws||!result.workerDraws||result.faceError||!keys.some(key=>key.startsWith('viseme_')&&result.localWeights[key]>0)||!keys.some(key=>key.startsWith('blink_')&&result.localWeights[key]>0)||weightMax>1e-6)throw Error('Guardian Worker parity failed: '+JSON.stringify(result));
 const summary={...result,weightMax,pixelMean:sum/left.length,pixelMax:max,scope:'Fixed pose, one blink and one narration clock sample; browser compositor captures, no full tutorial or timing comparison.'};
 if(process.env.QA_OUTPUT)await writeFile(process.env.QA_OUTPUT,JSON.stringify(summary,null,2));else console.log(JSON.stringify(summary));
 if(process.env.QA_SCREENSHOT_PREFIX){await writeFile(process.env.QA_SCREENSHOT_PREFIX+'-main.png',a);await writeFile(process.env.QA_SCREENSHOT_PREFIX+'-worker.png',b);}
 await page.evaluate(()=>{window.__guardians.local.dispose();window.__guardians.worker.dispose();});
}finally{await browser.close();}
