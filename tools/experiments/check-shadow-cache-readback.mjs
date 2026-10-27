import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.WG_SHADOW_READBACK_OUT??'docs/qa/residual-spikes-20261027/shadow-readback';
await mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1000,height:800}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto((process.env.WG_QA_URL??'http://127.0.0.1:5220')+'/tests/browser/shadow-cache-view-camera.html');
 await page.locator('#run').click();
 await page.waitForFunction(()=>{try{return typeof JSON.parse(document.querySelector('#result').textContent).passed==='boolean';}catch{return false;}},null,{timeout:120000});
 const report=JSON.parse(await page.locator('#result').textContent());report.pageErrors=errors;
 await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await page.screenshot({path:out+'/result.png',fullPage:true});
 if(!report.passed||errors.length)throw Error('Shadow readback failed; inspect report');
 console.log(JSON.stringify({passed:true,checks:report.checks.length,out}));
}finally{await browser.close();}
