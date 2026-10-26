import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='docs/qa/beast-integration-20261025/groups/resources',base=process.env.WG_QA_URL??'http://127.0.0.1:5218';
await mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 const url=base+'/tests/browser/animal-preload.html?biome=gran-canon&motion=1&copies=2&load-reserves=1&approved=1';
 await page.goto(url,{waitUntil:'commit',timeout:90000});
 await page.waitForFunction(()=>{try{return JSON.parse(document.querySelector('#report').textContent).ok!==undefined}catch{return false}},null,{timeout:240000});
 const report=JSON.parse(await page.locator('#report').innerText());report.qaUrl=url;
 await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
 assert(report.ok,JSON.stringify(report));assert.equal(report.spawnSpecies.length,10);assert.equal(report.loadReservedRigs,10);
 for(const r of Object.values(report.repeatedRigResources)){assert.equal(r.copies,2);assert.equal(r.uniqueModels,2);assert(r.privateSkeletons&&r.privateBoneTextures&&r.sharedGeometry&&r.sharedMaterials);}
 assert.equal(report.after.newAnimalPrograms.length,0);assert.equal(report.after.downloads,report.before.downloads);
 await page.locator('#report').evaluate(e=>e.style.display='none');await page.screenshot({path:out+'/group.png'});
 console.log('PASS: ten reserved rigs, independent skeletons and bone textures, shared assets, no new beast programs or downloads at appearance');
}finally{await browser.close();}
