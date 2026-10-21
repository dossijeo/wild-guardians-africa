import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const {chromium}=await import(pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.goto((process.env.WG_QA_URL??'http://127.0.0.1:5259')+'/?qa-microevents&qa-microevents-fixture=wood');
 await page.waitForFunction(()=>!!window.__microevents,null,{timeout:120000});
 const rows=await page.evaluate(async()=>{
  const c=window.__microevents;await c.billboards.ready;c.qaFrozen=true;c.cancel('qa');c.state.time=100;
  c.director.random=(()=>{let seed=178;return()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);})();
  if(!await c.force('raincloud'))throw Error('Cannot spawn raincloud');
  for(let i=0;i<45;i++)c.particles.step(1/60,null);
  const T=await import('/node_modules/three/build/three.module.js');
  const before=await new T.TextureLoader().loadAsync('/content/microevents/atlas-before.webp');before.colorSpace=T.SRGBColorSpace;
  const after=c.billboards.texture,rows=[];
  for(const label of ['before','after','after','before']){
   c.billboards.material.uniforms.uAtlas.value=label==='before'?before:after;
   for(let i=0;i<20;i++)await new Promise(requestAnimationFrame);
   const frames=[];let last=await new Promise(requestAnimationFrame);
   for(let i=0;i<120;i++){const now=await new Promise(requestAnimationFrame);frames.push(now-last);last=now;}
   rows.push({label,frames,instances:c.billboards.count,render:{...c.world.renderer.info.render},renderer:c.diagnostic.dataset.renderer});
  }
  return rows;
 });
 for(const row of rows){const sorted=[...row.frames].sort((a,b)=>a-b);row.summary={medianMs:sorted[60],p95Ms:sorted[114],averageFps:1000*row.frames.length/row.frames.reduce((a,b)=>a+b,0)};}
 const report={scope:'Chrome Intel UHD, 1280x720, real full-scene rAF intervals, frozen QA fixture and frozen raincloud age 0.75s, 120 frames per ABBA arm. This measures presentation scheduling, not live campaign FPS or pure GPU time.',rows,errors};
 writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(rows.map(({label,summary,instances,render})=>({label,summary,instances,calls:render.calls}))));
 if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
