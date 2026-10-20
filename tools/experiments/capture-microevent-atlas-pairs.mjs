import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href);
import sharp from 'sharp';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const p=await browser.newPage({viewport:{width:1280,height:720}});await p.goto((process.env.WG_QA_URL??'http://127.0.0.1:5248')+'/?qa-microevents&qa-microevents-fixture=wood');await p.waitForFunction(()=>!!window.__microevents,null,{timeout:120000});
await p.evaluate(async()=>{const c=window.__microevents;await c.billboards.ready;const T=await import('/node_modules/three/build/three.module.js');window.artBefore=await new T.TextureLoader().loadAsync('/content/microevents/atlas-before.webp');window.artBefore.colorSpace=T.SRGBColorSpace;window.artAfter=c.billboards.texture;});
const tiles=[];for(const [i,id] of ['feather','flower','spores'].entries()){
await p.evaluate(async id=>{const c=window.__microevents;c.cancel('qa');c.qaFrozen=true;c.state.time=100;c.director.random=(()=>{let seed=178;return()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);})();await c.force(id);for(let i=0;i<45;i++)c.particles.step(1/60,{present:false,owned:false,x:0,y:0,vx:0,vy:0,hold:0});if(id==='burrow')for(const v of c.particles.pool)v.reveal=1;c.refreshQaHit();},id);
for(const [j,label] of ['before','after'].entries()){
await p.evaluate(label=>window.__microevents.billboards.material.uniforms.uAtlas.value=label==='before'?window.artBefore:window.artAfter,label);await p.waitForTimeout(80);
const file=`docs/qa/microevents/art-finish/${id}-${label}.webp`;await sharp(await p.screenshot()).webp({lossless:true}).toFile(file);
tiles.push({input:await sharp(file).extract({left:740,top:235,width:280,height:200}).png().toBuffer(),left:j*280,top:i*200});
}}
await sharp({create:{width:560,height:600,channels:4,background:'#1e3022'}}).composite(tiles).webp({lossless:true}).toFile('docs/qa/microevents/art-finish/comparison.webp');
}finally{await browser.close();}
