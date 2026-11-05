import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));await page.route('**/biome-material-qa',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html>'}));await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5175')+'/biome-material-qa');
 const output=await page.evaluate(async({biome,extended,compareShadow,shadowCutout})=>{
  const run=(shared,shadow)=>new Promise((resolve,reject)=>{const worker=new Worker('/tests/browser/webgpu-biome-material-sharing-worker.js',{type:'module'}),canvas=new OffscreenCanvas(768,512);worker.onerror=e=>reject(Error(e.message));worker.onmessage=({data})=>{worker.terminate();data.error?reject(Error(data.error)):resolve(data);};worker.postMessage({canvas,shared,biome,extended,shadowCutout:shadow},[canvas]);});
  const a=await run(compareShadow?true:false,compareShadow?false:shadowCutout),b=await run(true,compareShadow?true:shadowCutout),compare=(left,right)=>{let sum=0,max=0,changed=0;for(let i=0;i<left.length;i+=4){let pixelMax=0;for(let c=0;c<3;c++){const d=Math.abs(left[i+c]-right[i+c]);sum+=d;max=Math.max(max,d);pixelMax=Math.max(pixelMax,d);}if(pixelMax>3)changed++;}return {meanAbsoluteRgb:sum/(768*512*3),maxChannel:max,pixelsAbove3:changed};};
  const comparison=compare(a.pixels,b.pixels),views=extended?a.views.map((value,i)=>compare(value,b.views[i])):undefined;delete a.pixels;delete b.pixels;delete a.views;delete b.views;return {rows:[a,b],comparison,...(views?{views}:{})};
 },{biome:process.env.QA_BIOME??'sabana',extended:process.env.QA_EXTENDED==='1',compareShadow:process.env.QA_COMPARE_SHADOW==='1',shadowCutout:process.env.QA_SHADOW_CUTOUT==='1'});
 if(errors.length)throw Error(JSON.stringify(errors));if(process.env.QA_OUT_FILE)await writeFile(process.env.QA_OUT_FILE,JSON.stringify(output,null,2));console.log(JSON.stringify(output));
}finally{await browser.close();}
