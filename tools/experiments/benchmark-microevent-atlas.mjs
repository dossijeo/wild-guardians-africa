import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href);
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const p=await browser.newPage({viewport:{width:1280,height:720}});
 await p.goto((process.env.WG_QA_URL??'http://127.0.0.1:5248')+'/?qa-microevents&qa-microevents-fixture=wood');
 await p.waitForFunction(()=>!!window.__microevents,null,{timeout:120000});
 const data=await p.evaluate(async()=>{
 const c=window.__microevents;await c.billboards.ready;c.qaFrozen=true;c.cancel('qa');c.state.time=100;await c.force('spores');c.particles.step(.75,null);c.refreshQaHit();
 const T=await import('/node_modules/three/build/three.module.js');
 const before=await new T.TextureLoader().loadAsync('/content/microevents/atlas-before.webp');before.colorSpace=T.SRGBColorSpace;
 const after=c.billboards.texture,r=c.world.renderer,gl=r.getContext(),samples={before:[],after:[]};
 for(let round=0;round<8;round++)for(const label of (round%2?['after','before']:['before','after'])){
 c.billboards.material.uniforms.uAtlas.value=label==='before'?before:after;
 for(let i=0;i<10;i++)r.render(c.world.scene,c.world.camera);gl.finish();
 for(let i=0;i<30;i++){const t=performance.now();r.render(c.world.scene,c.world.camera);gl.finish();samples[label].push(performance.now()-t);}
 }
 return {samples,renderer:c.diagnostic.dataset.renderer,render:r.info.render,instances:c.billboards.count};
 });
 for(const a of Object.values(data.samples))a.sort((a,b)=>a-b);
 data.summary=Object.fromEntries(Object.entries(data.samples).map(([key,a])=>[key,{n:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)]}]));
 writeFileSync('docs/qa/microevents/art-finish/benchmark.json',JSON.stringify(data,null,2));console.log(data.summary);
}finally{await browser.close();}
