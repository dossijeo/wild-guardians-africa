import {writeFileSync,unlinkSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const path=`src/rendering/confirmed-scene-benchmark-temp-${process.pid}.js`;let created=false,browser;
try{
 writeFileSync(path,execFileSync('git',['show','0e8b843d5:src/rendering/confirmed-scene-receiver.js']),{flag:'wx'});created=true;
 browser=await chromium.launch({channel:'msedge',headless:true,args:process.env.QA_NATIVE_GPU==='1'?[]:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage();page.on('response',r=>{if(r.status()>=400)console.error(r.status(),r.url());});page.on('requestfailed',r=>console.error(r.failure()?.errorText,r.url()));await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/tests/browser/simulation-authority-postgame.html`);
 const result=await page.evaluate(async baseline=>{
  const {createConfirmedSceneReceiver:original}=await import('/'+baseline).catch(e=>{throw Error('baseline '+baseline+': '+e.message);}),{createConfirmedSceneReceiver:current}=await import('/src/rendering/confirmed-scene-receiver.js'),{deserialize,serialize}=await import('/src/persistence/snapshots.js');
  const response=await fetch('/tests/fixtures/manglares-123-d10-raid-state.json.gz');if(!response.ok)throw Error('Fixture fetch failed: '+response.status);const source=await response.text();
  const gl=document.createElement('canvas').getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info'),device=gl?(ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)):null;
  function run(factory){const state=deserialize(source),receiver=factory(state,'bench',{state,mixers:new Map()}),samples=[];for(let i=1;i<=45;i++){const start=performance.now();receiver.accept({session:'bench',sequence:i,snapshot:source,events:[],physicsPose:null});if(i>5)samples.push(performance.now()-start);}if(serialize(state)!==serialize(deserialize(source)))throw Error('State changed');samples.sort((a,b)=>a-b);return {mean:samples.reduce((a,b)=>a+b,0)/samples.length,p95:samples[Math.ceil(samples.length*.95)-1],p99:samples.at(-1)};}
  const results=[];for(const mode of ['original','current','current','original'])results.push({mode,...run(mode==='original'?original:current)});return {device,snapshotChars:source.length,samplesPerRun:40,results,scope:'Browser main-thread CPU, deterministic mangrove capture and complete confirmed scene acceptance, no physical poses or rendered frames; A/B/B/A.'};
 },path);if(process.env.QA_EXPECT_GPU&&!result.device?.includes(process.env.QA_EXPECT_GPU))throw Error('Unexpected GPU: '+result.device);console.log(JSON.stringify(result));
}finally{await browser?.close();if(created)unlinkSync(path);}
