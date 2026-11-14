import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';

// Regression of the material/normal transform now shared by native routes and
// historical replay. The existing browser test compares actual rendered pixels.
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5181')+'/tests/browser/native-gpu-character.html');
 const result=await page.evaluate(async()=>{const {auditYawNormals}=await import('/tests/browser/confirmed-gpu-motion-webgpu.js');return {ordinary:await auditYawNormals(),shadows:await auditYawNormals({shadows:true})};});
 await writeFile(process.env.OUTPUT??'docs/guardian/performance/native-gpu-shared-material-regression-20261114.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
