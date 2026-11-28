import fs from 'node:fs';import {createRequire} from 'node:module';import {approvedVisualSearch} from '../../src/rendering/approved-visual-profile.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.addInitScript(()=>{window.shaderFailures=[];window.failedShaderSources=[];
 const original=WebGL2RenderingContext.prototype.linkProgram;WebGL2RenderingContext.prototype.linkProgram=function(program){original.call(this,program);if(!this.getProgramParameter(program,this.LINK_STATUS))window.failedShaderSources.push({log:this.getProgramInfoLog(program),sources:this.getAttachedShaders(program).map(shader=>({type:this.getShaderParameter(shader,this.SHADER_TYPE),source:this.getShaderSource(shader)}))});};
 for(const name of ['error','unhandledrejection'])addEventListener(name,event=>{const e=event.error??event.reason;window.shaderFailures.push({message:String(e),stack:e?.stack,details:e?.details});});});
 const mode=process.env.SHADER_BASELINE==='1'?'baseline':'near';
 await page.goto('http://127.0.0.1:5175/tests/browser/african-toon.html?'+approvedVisualSearch('manglares',`case=11&q=media&visualLabReference=1${mode==='baseline'?'&noNearTreeTextures':''}`),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.shaderFailures.length||document.querySelector('#status')?.textContent.includes('/30 ·'),null,{timeout:300000});
 const report=await page.evaluate(()=>({errors:window.shaderFailures,failedShaderSources:window.failedShaderSources,status:document.querySelector('#status').textContent}));
 fs.writeFileSync(`docs/lighting/tree-near-retexture/performance/mangrove-shader-${mode}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({errors:report.errors,status:report.status,failedPrograms:report.failedShaderSources.length}));
}finally{await browser.close();}
