import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.route('**/admission-color-qa',route=>route.fulfill({contentType:'text/html',body:'<canvas width="192" height="192"></canvas>'}));await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5182')+'/admission-color-qa');
 const result=await page.evaluate(()=>new Promise((resolve,reject)=>{const worker=new Worker('/tests/browser/webgpu-admission-color-worker.js',{type:'module'}),canvas=document.querySelector('canvas').transferControlToOffscreen(),timer=setTimeout(()=>{worker.terminate();reject(Error('Color admission timeout'));},150000);worker.onerror=event=>{clearTimeout(timer);worker.terminate();reject(Error(event.message));};worker.onmessage=async({data})=>{clearTimeout(timer);if(data.image){data.imageBytes=Array.from(new Uint8Array(await data.image.arrayBuffer()));delete data.image;}worker.terminate();resolve(data);};worker.postMessage({canvas},[canvas]);}));
 if(result.imageBytes){await writeFile(process.env.QA_IMAGE??'.cache/admission-color-matrix.png',new Uint8Array(result.imageBytes));delete result.imageBytes;}await writeFile(process.env.OUTPUT??'.cache/admission-color-matrix.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(!result.ok)throw Error(result.error);
}finally{await browser.close();}
