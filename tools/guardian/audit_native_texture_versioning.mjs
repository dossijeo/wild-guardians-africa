import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5181')+'/tests/browser/native-worker-world-owner.html');
 const result=await page.evaluate(async()=>{const {auditNativeTextureVersioning}=await import('/tests/browser/native-texture-versioning.js');return auditNativeTextureVersioning();});
 if(errors.length||result.errors.length||/swiftshader|software/i.test(JSON.stringify(result.adapter))||!result.adapter.vendor)throw Error(JSON.stringify({result,errors}));
 const output=process.env.OUTPUT??'docs/guardian/performance/native-texture-versioning-20261114.json';await writeFile(output,JSON.stringify({result,errors},null,2)+'\n');console.log(JSON.stringify({output,result}));
}finally{await browser.close();}
