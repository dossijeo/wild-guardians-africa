import {readFile,writeFile,unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const source=await readFile('tools/experiments/check-shield-repeat-render.mjs','utf8');
const anchor=' report.after=await inspect();';if(source.split(anchor).length!==2)throw Error('Harness anchor changed');
const injected=`
 report.readableOverlays=await page.evaluate(async()=>{
  const {ScreenOverlays,preloadScreenOverlays}=await import('/src/ui/screen-overlays.js');
  await preloadScreenOverlays();const stage=document.querySelector('#stage'),overlay=new ScreenOverlays(stage,{quality:()=>qaMagicWorld.quality,reduced:()=>false});
  globalThis.qaReadableOverlay=overlay;overlay.request('shield');overlay.update();const start=overlay.policy.active.start,end=overlay.policy.active.end,samples=[];
  let rejected=0;while(performance.now()<end+150){await new Promise(requestAnimationFrame);const now=performance.now();if(now<end-200&&now-start>100){if(!overlay.request('growth'))rejected++;}overlay.update();samples.push({elapsed:now-start,id:overlay.policy.active?.id??null,hidden:overlay.canvas.hidden});}
  const result={durationMs:end-start,rejected,samples,drawCount:overlay.drawCount,pending:overlay.policy.pending};if(result.durationMs!==2500||!rejected||result.pending||!samples.some(s=>s.elapsed>2000&&s.id==='shield')||samples.at(-1).id!==null)throw Error('Overlay timing failed');return result;
 });
 await page.evaluate(()=>{qaReadableOverlay.request('shield');qaReadableOverlay.update();});
 await page.waitForTimeout(900);await page.evaluate(()=>qaReadableOverlay.update());await page.screenshot({path:out+'/shield-readable.png'});
 await page.evaluate(()=>{qaReadableOverlay.dispose();delete globalThis.qaReadableOverlay;});
`;
const temp='tools/experiments/.readable-overlays-generated.mjs';try{await writeFile(temp,source.replace(anchor,injected+anchor),{flag:'wx'});const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('WG_')));Object.assign(env,{WG_BEAST_QA_OUT:'docs/qa/postmerge-ui-20261027/overlays',WG_QA_URL:'http://127.0.0.1:5220',WG_MAGIC_FIXTURE:'docs/qa/mangrove-magic-20261026/hydraulic-v2-agriculture/fixture.json',WG_MAGIC_PROFILE:'1',WG_MAGIC_CPU_SAMPLING:'0',WG_MAGIC_VIDEO:'0',WG_MAGIC_GPU:'0',WG_MAGIC_CASTS:'0',WG_MAGIC_NO_CAST:'1',WG_MAGIC_STREAM:'0'});await new Promise((resolve,reject)=>{const c=spawn(process.execPath,[temp],{env,stdio:'inherit'});c.on('error',reject);c.on('exit',code=>code===0?resolve():reject(Error('Overlay browser check failed '+code)));});}finally{await unlink(temp).catch(()=>{});}
