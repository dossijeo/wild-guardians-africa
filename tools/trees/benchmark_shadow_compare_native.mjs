import fs from 'node:fs';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?lightingReview&biome=manglares&culture=mapungubwe&characterLod=auto&treeReview');
await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:420000});
const result=await page.evaluate(async()=>{const r=window.treeReview,w=r.world;for(let i=0;i<180;i++)await new Promise(requestAnimationFrame);const cache=w.releaseNativeShadow.cache,snapshot=cache.snapshot;if(!snapshot)throw Error('No native shadow snapshot');r.setManual(true);const values=snapshot.slice();
const old=()=>cache.enabled&&!false&&snapshot&&values.length===snapshot.length&&values.every((v,i)=>Object.is(v,snapshot[i]));const newer=()=>cache.matches(values,false);for(let i=0;i<200;i++){old();newer()};const blocks=[];for(const fn of [old,newer,newer,old]){let t=performance.now();for(let i=0;i<250;i++)if(!fn())throw Error('unexpected mismatch');blocks.push({method:fn===old?'old':'new',ms:(performance.now()-t)/250})}return {blocks,values:values.length,authority:r.authority,network:r.state.mangroveNetwork,cacheStats:{...cache.stats},scope:'Frozen actual native mangrove shadow snapshot, CPU comparison only; no simulation, scene traversal, GPU, or frame cadence measured.'}});
const out='docs/lighting/tree-near-retexture/performance/shadow-compare-native.json';fs.writeFileSync(out,JSON.stringify({...result,errors},null,2)+'\n');console.log(JSON.stringify(result));if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close()}
