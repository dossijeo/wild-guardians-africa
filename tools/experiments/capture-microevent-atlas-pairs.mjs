import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href);
import sharp from 'sharp';
const browser=await chromium.launch({channel:'chrome',headless:true}),rows=[],errors=[];
try{const p=await browser.newPage({viewport:{width:1280,height:720}});p.on('pageerror',e=>errors.push(String(e)));await p.goto((process.env.WG_QA_URL??'http://127.0.0.1:5248')+'/?qa-microevents&qa-microevents-fixture=wood');await p.waitForFunction(()=>!!window.__microevents,null,{timeout:120000});
await p.evaluate(async()=>{const c=window.__microevents;await c.billboards.ready;const T=await import('/node_modules/three/build/three.module.js');window.artBefore=await new T.TextureLoader().loadAsync('/content/microevents/atlas-before.webp');window.artBefore.colorSpace=T.SRGBColorSpace;window.artAfter=c.billboards.texture;});
const out=process.argv[2]??'docs/qa/microevents/art-finish',ids=(process.argv[3]??'feather,flower,spores').split(',');
mkdirSync(out,{recursive:true});
// Use the event's valid clock phase and advance the real burrow reveal cycle;
// assigning reveal manually is overwritten by the next frozen (dt=0) tick.
const tiles=[];for(const [i,id] of ids.entries()){
await p.evaluate(async ({id,reveal})=>{const c=window.__microevents;const {EVENTS}=await import('/src/microevents/definitions.js');c.cancel('qa');c.qaFrozen=true;c.state.time=EVENTS[id].night?310:100;c.director.random=(()=>{let seed=178;return()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);})();if(!await c.force(id))throw Error(`Cannot spawn ${id}`);for(let i=0;i<45;i++)c.particles.step(1/60,{present:false,owned:false,x:0,y:0,vx:0,vy:0,hold:0});if(id==='burrow'&&reveal)for(let i=0;i<180&&Math.max(...c.particles.pool.slice(0,c.particles.count).map(v=>v.reveal))<.85;i++)c.particles.step(1/60,null);c.refreshQaHit();},{id,reveal:process.argv[5]!=='hidden'});
if(process.argv[4]==='night'){await p.evaluate(()=>window.__microevents.state.time=310);await p.waitForTimeout(250);}
for(const [j,label] of ['before','after'].entries()){
await p.evaluate(label=>window.__microevents.billboards.material.uniforms.uAtlas.value=label==='before'?window.artBefore:window.artAfter,label);await p.waitForTimeout(80);
const file=`${out}/${id}-${label}.webp`;await sharp(await p.screenshot()).webp({lossless:true}).toFile(file);
rows.push({id,label,...await p.evaluate(()=>{const c=window.__microevents;return {time:c.state.time,particleTime:c.particles.time,reveal:c.particles.pool.slice(0,c.particles.count).map(p=>p.reveal),instances:c.billboards.count,render:c.world.renderer.info.render,renderer:c.diagnostic.dataset.renderer};})});
tiles.push({input:await sharp(file).extract({left:710,top:180,width:330,height:230}).png().toBuffer(),left:j*330,top:i*230});
}}
await sharp({create:{width:660,height:ids.length*230,channels:4,background:'#1e3022'}}).composite(tiles).webp({lossless:true}).toFile(`${out}/comparison.webp`);
writeFileSync(`${out}/captures.json`,JSON.stringify({seed:178,viewport:[1280,720],rows,errors},null,2)+'\n');
if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
