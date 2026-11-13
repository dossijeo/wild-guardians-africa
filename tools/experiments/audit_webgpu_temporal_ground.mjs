import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const retirement=process.env.QA_RETIREMENT==='true';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage(),reports=[];await page.route('**/ground-qa',r=>r.fulfill({status:200,contentType:'text/html',body:'<canvas width=512 height=512></canvas>'}));await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5200')+'/ground-qa');
 for(const daylight of retirement?[true]:[false,true])for(const biome of retirement?['sabana']:['sabana','gran-rio','manglares','desierto','volcanes','gran-canon']){
  const result=await page.evaluate(({biome,daylight,retirement})=>new Promise((resolve,reject)=>{const worker=new Worker('/tests/browser/webgpu-temporal-ground-worker.js',{type:'module'}),canvas=new OffscreenCanvas(512,512),timeout=setTimeout(()=>{worker.terminate();reject(Error('Ground test timeout'));},150000);worker.onerror=e=>{clearTimeout(timeout);worker.terminate();reject(Error(e.message));};worker.onmessage=async({data})=>{clearTimeout(timeout);worker.terminate();if(data.retiredImage){data.retiredPng=[...new Uint8Array(await data.retiredImage.arrayBuffer())];delete data.retiredImage;}if(data.image){const bitmap=await createImageBitmap(data.image),ctx=document.querySelector('canvas').getContext('2d');ctx.drawImage(bitmap,0,0);bitmap.close();const pixels=ctx.getImageData(0,0,512,512).data;let differing=0;for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-pixels[0])+Math.abs(pixels[i+1]-pixels[1])+Math.abs(pixels[i+2]-pixels[2])>10)differing++;data.differingPixels=differing;delete data.image;}resolve(data);};worker.postMessage({canvas,biome,daylight,retirement},[canvas]);}),{biome,daylight,retirement});
  if(result.retiredPng){await writeFile('.cache/temporal-ground-retired.png',new Uint8Array(result.retiredPng));delete result.retiredPng;}result.daylight=daylight;console.log(JSON.stringify(result));if(!result.ok)throw Error(result.error);if(result.differingPixels<500)throw Error('Blank ground frame');reports.push(result);await page.locator('canvas').screenshot({path:'.cache/temporal-ground-'+biome+(daylight?'-day':'-night')+'.png'});
 }
 await writeFile(process.env.OUTPUT??'.cache/temporal-ground-report.json',JSON.stringify(reports,null,2));
}finally{await browser.close();}
