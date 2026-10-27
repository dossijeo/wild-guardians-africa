import {readFile,writeFile,unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const source=await readFile('tools/experiments/check-beast-raid-ui.mjs','utf8');
const start='assert(free.length,\'No ground target visible outside the HUD\');report.attempts=[];';
const end='report.ok=true;assert.deepEqual(errors,[]);';
for(const anchor of [start,end])if(source.split(anchor).length!==2)throw Error('Harness anchor changed');
const begin=`
 await page.evaluate(()=>{
  const canvas=document.querySelector('.juice-overlay');if(!canvas)throw Error('Production overlay missing');
  globalThis.qaOverlayTransitions=[{at:performance.now(),hidden:canvas.hidden}];
  globalThis.qaOverlayObserver=new MutationObserver(()=>{const last=qaOverlayTransitions.at(-1);if(last.hidden!==canvas.hidden)qaOverlayTransitions.push({at:performance.now(),hidden:canvas.hidden});});
  qaOverlayObserver.observe(canvas,{attributes:true,attributeFilter:['hidden']});
 });
`;
const finish=`
 report.overlay=await page.evaluate(()=>{qaOverlayObserver.disconnect();return {transitions:qaOverlayTransitions,canvasCount:document.querySelectorAll('.juice-overlay').length,hidden:document.querySelector('.juice-overlay').hidden};});
 const shown=report.overlay.transitions.findIndex(s=>!s.hidden),hidden=report.overlay.transitions.slice(shown+1).find(s=>s.hidden);
 assert(shown>=0&&hidden,'Actual shield action must show and finish an overlay');
 report.overlay.visibleMs=hidden.at-report.overlay.transitions[shown].at;
 assert(report.overlay.visibleMs>=2300&&report.overlay.visibleMs<3500,'Shield overlay must last about 2.5 seconds');
 assert.equal(report.overlay.canvasCount,1);assert.equal(report.overlay.hidden,true);
`;
const temp='tools/experiments/.overlay-gameplay-generated.mjs';
try{
 const diagnostics="page.on('response',response=>{if(response.status()>=400)(report.httpFailures??=[]).push({url:response.url(),status:response.status()});});page.on('console',message=>{if(message.type()==='error')(report.consoleDetails??=[]).push({text:message.text(),location:message.location()});});";
 await writeFile(temp,source.replace('let profiler;','let profiler;'+diagnostics).replace(start,start+begin).replace(end,finish+end),{flag:'wx'});
 const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('WG_')));
 Object.assign(env,{WG_QA_URL:'http://127.0.0.1:5220',WG_BEAST_QA_OUT:process.env.WG_OVERLAY_UI_OUT??'docs/qa/postmerge-ui-20261027/overlay-gameplay',WG_BEAST_FIXTURE:'docs/qa/mangrove-magic-20261026/hydraulic-v2-raid/fixture.json',WG_SHIELD_PROTECT_CROPS:'1'});
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[temp],{env,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Gameplay overlay check failed: '+code)));});
}finally{await unlink(temp).catch(()=>{});}
