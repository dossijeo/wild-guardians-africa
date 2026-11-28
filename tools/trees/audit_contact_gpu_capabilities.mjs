import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5175/');
 const capabilities=await page.evaluate(async()=>{
  const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2'),debug=gl?.getExtension('WEBGL_debug_renderer_info');let gpu={exposed:!!navigator.gpu};
  if(navigator.gpu)try{const adapter=await navigator.gpu.requestAdapter();gpu={exposed:true,adapter:!!adapter,info:adapter?.info?{vendor:adapter.info.vendor,architecture:adapter.info.architecture,device:adapter.info.device,description:adapter.info.description}:null,features:adapter?[...adapter.features]:[],limits:adapter?{maxStorageBufferBindingSize:adapter.limits.maxStorageBufferBindingSize,maxComputeWorkgroupSizeX:adapter.limits.maxComputeWorkgroupSizeX}:null};}catch(error){gpu={exposed:true,error:String(error)};}
  return {webgl2:!!gl,renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl?.getParameter(gl.RENDERER),transformFeedback:!!gl?.beginTransformFeedback,floatColor:!!gl?.getExtension('EXT_color_buffer_float'),gpuTimer:!!gl?.getExtension('EXT_disjoint_timer_query_webgl2'),webgpu:gpu,userAgent:navigator.userAgent};
 });
 fs.writeFileSync('docs/lighting/tree-near-retexture/performance/contact-gpu-capabilities.json',JSON.stringify(capabilities,null,2));console.log(JSON.stringify(capabilities));
}finally{await browser.close();}
