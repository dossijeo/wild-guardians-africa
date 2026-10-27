import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const old=execFileSync('git',['show','2315e85e5:public/menu/native.js'],{encoding:'utf8',maxBuffer:8e6});
const current=await readFile('public/menu/native.js','utf8');
const quality=process.env.WG_MENU_QUALITY??'balanced',journey=process.env.WG_MENU_JOURNEY==='1';
const instrumentation=`
const menuMeasure={cpu:[],gpu:[],interval:[],pending:[],frames:0,last:0,disjoint:false};
window.__menuMeasure=menuMeasure;
function draw(t){
 const m=menuMeasure,ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
 if(ext){if(gl.getParameter(ext.GPU_DISJOINT_EXT)){m.disjoint=true;}while(m.pending.length&&gl.getQueryParameter(m.pending[0],gl.QUERY_RESULT_AVAILABLE)){const q=m.pending.shift();const ns=gl.getQueryParameter(q,gl.QUERY_RESULT);if(!m.disjoint)m.gpu.push(ns/1e6);gl.deleteQuery(q);}}
 if(${journey}){if(m.frames===30)navigate(2);if(m.frames===100)back();}
 const record=m.frames>=30&&m.frames<180;
 const q=record&&ext?gl.createQuery():null;
 if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);
 const start=performance.now();menuMeasuredDraw(t);const end=performance.now();
 if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);m.pending.push(q);}
 if(record){m.cpu.push(end-start);if(m.last)m.interval.push(start-m.last);}
 m.last=start;m.frames++;
 if(m.frames>=190&&!m.pending.length){m.done=true;m.renderer=gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL??gl.RENDERER);}
}
`;
const summary=a=>{const b=[...a].sort((a,b)=>a-b);return {n:a.length,mean:a.reduce((s,v)=>s+v,0)/a.length,p50:b[Math.floor(b.length*.5)],p95:b[Math.floor(b.length*.95)],p99:b[Math.floor(b.length*.99)],max:b.at(-1)};};
const browser=await chromium.launch({channel:'chrome',headless:true});const runs=[];
try{for(const variant of ['original','layered','original','layered']){
 const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage();
 page.on('pageerror',e=>console.error(String(e)));page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
 await page.route('**/menu/native.js',route=>route.fulfill({contentType:'text/javascript',body:(variant==='original'?old:current).replace("quality:'balanced'","quality:'"+quality+"'").replaceAll("startsWith('/assets/')","includes('assets/')").replace('function draw(t){','function menuMeasuredDraw(t){').replace('function tick(now){',instrumentation+'\nfunction tick(now){')}));
 await page.goto('http://127.0.0.1:5220/menu/index.html');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});await page.waitForFunction(()=>window.__menuMeasure?.done,null,{timeout:60000});
 const m=await page.evaluate(()=>{const {cpu,gpu,interval,disjoint,renderer}=window.__menuMeasure;return {cpu,gpu,interval,disjoint,renderer};});runs.push({variant,...m,cpuSummary:summary(m.cpu),gpuSummary:summary(m.gpu),drawIntervalSummary:summary(m.interval)});console.log(JSON.stringify({variant,cpu:summary(m.cpu),gpu:summary(m.gpu),interval:summary(m.interval),disjoint:m.disjoint,renderer:m.renderer}));await context.close();
}}finally{await browser.close();await writeFile('docs/qa/postmerge-ui-20261027/totem-ground-v1/benchmark-'+quality+'-'+(journey?'journey':'resident')+'.json',JSON.stringify({quality,journey,scope:'QA route substitutes ONLY menu JS to compare committed merge baseline and current renderer with identical 1280x720 viewport. 30 draw warmup, 150 measured draws. No video. draw interval is not physical presentation. GPU timer query measured full draw, disjoint samples invalid.',runs},null,2));}
