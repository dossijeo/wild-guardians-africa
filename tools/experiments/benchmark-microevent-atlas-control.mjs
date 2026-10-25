import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const {chromium}=await import(pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href);
const event=process.argv[3]??'raincloud',cell=Number(process.argv[4]??17);
if(!Number.isInteger(cell)||cell<0||cell>63)throw Error('Expected atlas cell 0..63');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.goto((process.env.WG_QA_URL??'http://127.0.0.1:5259')+'/?qa-microevents&qa-microevents-fixture=wood');
 await page.waitForFunction(()=>!!window.__microevents,null,{timeout:120000});
 const data=await page.evaluate(async({event,cell})=>{
  const c=window.__microevents;await c.billboards.ready;c.qaFrozen=true;c.cancel('qa');c.state.time=100;
  c.director.random=(()=>{let seed=178;return()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);})();
  if(!await c.force(event))throw Error(`Cannot spawn ${event}`);
  for(let i=0;i<45;i++)c.particles.step(1/60,null);
  const T=await import('/node_modules/three/build/three.module.js');
  const before=await new T.TextureLoader().loadAsync('/content/microevents/atlas-before.webp');before.colorSpace=T.SRGBColorSpace;
  const after=c.billboards.texture;
  // Restore the selected event's changed cell to control for temporal drift.
  // Default raincloud uses cloud 17 plus unchanged raindrop 18; branch uses 59.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d'),x=cell%8*64,y=Math.floor(cell/8)*64;ctx.drawImage(after.image,0,0);ctx.clearRect(x,y,64,64);ctx.drawImage(before.image,x,y,64,64,x,y,64,64);
  const control=new T.CanvasTexture(canvas);control.colorSpace=T.SRGBColorSpace;
  const textures={before,after,control},r=c.world.renderer,gl=r.getContext(),blocks=[];
  for(let i=0;i<60;i++)await new Promise(requestAnimationFrame);
  for(const order of [['before','after','control'],['control','before','after'],['after','control','before']])for(const label of order){
   c.billboards.material.uniforms.uAtlas.value=textures[label];
   for(let i=0;i<20;i++)r.render(c.world.scene,c.world.camera);gl.finish();
   const render=[];
   for(let i=0;i<40;i++){const start=performance.now();r.render(c.world.scene,c.world.camera);gl.finish();render.push(performance.now()-start);}
   for(let i=0;i<20;i++)await new Promise(requestAnimationFrame);
   const frames=[];let last=await new Promise(requestAnimationFrame);
   for(let i=0;i<60;i++){const now=await new Promise(requestAnimationFrame);frames.push(now-last);last=now;}
   blocks.push({label,render,frames,calls:r.info.render.calls,instances:c.billboards.count});
  }
  return {blocks,renderer:c.diagnostic.dataset.renderer};
 },{event,cell});
 const stats=a=>{const sorted=[...a].sort((a,b)=>a-b);return {n:a.length,median:sorted[Math.floor(a.length*.5)],p95:sorted[Math.floor(a.length*.95)]};};
 const summary=Object.fromEntries(['before','after','control'].map(label=>{
  const blocks=data.blocks.filter(x=>x.label===label),render=blocks.flatMap(x=>x.render),frames=blocks.flatMap(x=>x.frames);
  return [label,{renderMs:stats(render),frameMs:stats(frames),averageFps:1000*frames.length/frames.reduce((a,b)=>a+b,0)}];
 }));
 for(const block of data.blocks)block.summary={renderMs:stats(block.render),frameMs:stats(block.frames),averageFps:1000*block.frames.length/block.frames.reduce((a,b)=>a+b,0)};
 writeFileSync(process.argv[2],JSON.stringify({scope:`Counterbalanced ABC/CAB/BCA; full render+gl.finish and actual rAF intervals; frozen ${event} fixture. C is new atlas with old cell ${cell} pixels. 120 render and 180 rAF samples per arm; not live campaign FPS or a GPU timestamp.`,...data,summary,errors},null,2)+'\n');
 console.log(JSON.stringify(summary));
 if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
