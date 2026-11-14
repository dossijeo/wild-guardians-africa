import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const samples=[];
 for(const biome of ['manglares']){
  const page=await browser.newPage({viewport:{width:512,height:512}});await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(/^webgl/i.test(kind))throw Error('WebGL forbidden in terrain WebGPU test');return original.call(this,kind,...args);};});
  await page.route('**/webgpu-terrain-native',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><canvas width="512" height="512"></canvas>'}));await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5175')+'/webgpu-terrain-native');
  const result=await page.evaluate(async biome=>{const worker=new Worker('/tests/browser/webgpu-mangrove-ground-worker.js',{type:'module'}),canvas=document.querySelector('canvas').transferControlToOffscreen();try{return await new Promise((resolve,reject)=>{worker.onerror=e=>reject(Error(e.message));worker.onmessage=e=>e.data.error?reject(Error(e.data.error)):resolve(e.data);worker.postMessage({canvas,biome},[canvas]);});}finally{worker.terminate();}},biome);
  if(result.backend!=='WebGPU'||result.vertexCount!==2401||result.indexCount!==13824||result.resident!==1||!Number.isFinite(result.centerHeight)||!result.drawCalls||result.nonBackground<1000||result.errors.length)throw Error('Terrain check failed: '+JSON.stringify(result));if(process.env.QA_SCREENSHOT){await page.evaluate(pixels=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=512;canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels),512,512),0,0);document.body.replaceChildren(canvas);},result.pixels);await page.screenshot({path:process.env.QA_SCREENSHOT});}delete result.pixels;samples.push(result);await page.close();
 }
 const report={samples,scope:'Experimental mangrove moss atlas with native confirmed chunk mask. TSL pure-moss UV, normal, ARH and direct/ambient lighting; no environment reflections, contact AO, gameplay or full visual parity comparison.'};if(process.env.QA_OUTPUT)await writeFile(process.env.QA_OUTPUT,JSON.stringify(report,null,2));else console.log(JSON.stringify(report));
}finally{await browser.close();}
