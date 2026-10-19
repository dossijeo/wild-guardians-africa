import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const origin=process.env.WG_QA_URL??'http://127.0.0.1:5188';
const browser=await chromium.launch({channel:'chrome',headless:true});
const cases=(process.env.WG_SHADOW_CASES??'1,6,11,16,21,26').split(',').map(Number);
const records=[];
try{
  for(const sceneCase of cases){
    const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
    await page.goto(`${origin}/tests/browser/african-toon.html?case=${sceneCase}&q=media&visualLab=0&visualLabReference=1`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status')?.textContent.includes('/30 ·'),null,{timeout:120000});
    const record=await page.evaluate(async()=>{
      const {world,state,biome}=window.qaVisualReference;
      const gl=world.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
      if(!ext)return {biome,supported:false};
      const map=world.renderer.shadowMap,original=map.render,all=[];
      map.render=function(...args){const query=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,query);try{return original.apply(this,args);}finally{gl.endQuery(ext.TIME_ELAPSED_EXT);all.push(query);}};
      const phases={};
      const run=(name,mutate)=>{const start=all.length,cache=world.releaseNativeShadow.cache,before={...cache.stats};for(let i=0;i<24;i++){mutate(i);world.sync(0);world.render(.016);}phases[name]={queries:all.slice(start),draws:cache.stats.draws-before.draws,hits:cache.stats.hits-before.hits};};
      try{run('static',()=>{});run('movingActor',()=>{state.workers[0].x+=.12;});run('movingCamera',()=>{world.controls.target.x+=8;world.camera.position.x+=8;});}
      finally{map.render=original;}
      gl.flush();
      for(let wait=0;wait<100&&!all.every(q=>gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE));wait++)await new Promise(resolve=>setTimeout(resolve,20));
      for(const data of Object.values(phases)){
        const times=[];for(const q of data.queries){if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE))times.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}delete data.queries;
        times.sort((a,b)=>a-b);const draws=times.filter(value=>value>.1);data.gpuMs={samples:times.length,drawSamples:draws.length,medianDraw:draws[Math.floor(draws.length/2)]??null,p95Draw:draws[Math.floor(draws.length*.95)]??null,meanPerFrame:times.reduce((a,b)=>a+b,0)/24};
      }
      return {biome,supported:true,phases,disjoint:gl.getParameter(ext.GPU_DISJOINT_EXT)};
    });
    console.log(record.biome,JSON.stringify(record.phases??record));records.push(record);await page.close();
  }
}finally{await browser.close();}
await mkdir('docs/qa/global-visual-lab/shadow-audit',{recursive:true});
await writeFile('docs/qa/global-visual-lab/shadow-audit/gpu.json',JSON.stringify({origin,cases,records},null,2)+'\n');
