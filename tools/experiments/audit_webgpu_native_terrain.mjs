import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const samples=[];
 for(const biome of ['sabana','manglares','volcanes']){
  const page=await browser.newPage({viewport:{width:512,height:512}});await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(/^webgl/i.test(kind))throw Error('WebGL forbidden in terrain WebGPU test');return original.call(this,kind,...args);};});
  await page.route('**/webgpu-terrain-native',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><canvas width="512" height="512"></canvas>'}));await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5175')+'/webgpu-terrain-native');
  const result=await page.evaluate(async biome=>{const worker=new Worker('/tests/browser/webgpu-terrain-native-worker.js',{type:'module'}),canvas=document.querySelector('canvas').transferControlToOffscreen();try{return await new Promise((resolve,reject)=>{worker.onerror=e=>reject(Error(e.message));worker.onmessage=e=>e.data.error?reject(Error(e.data.error)):resolve(e.data);worker.postMessage({canvas,biome},[canvas]);});}finally{worker.terminate();}},biome);
  if(result.backend!=='WebGPU'||result.vertexCount!==2401||result.indexCount!==13824||result.resident!==1||!Number.isFinite(result.centerHeight)||!result.drawCalls||result.nonBackground<1000||result.errors.length)throw Error('Terrain check failed: '+JSON.stringify(result));samples.push(result);await page.close();
 }
 const report={samples,scope:'Wild Engine-generated native chunk buffers rendered in a WebGPU Worker with temporary vertex-color material. Mangrove uses the connected island network flag. Terrain only: no actual biome ground shader, water, objects, shadows, gameplay or performance comparison.'};if(process.env.QA_OUTPUT)await writeFile(process.env.QA_OUTPUT,JSON.stringify(report,null,2));else console.log(JSON.stringify(report));
}finally{await browser.close();}
