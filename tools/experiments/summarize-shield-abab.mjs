import {readFile,writeFile} from 'node:fs/promises';
const root=process.argv[2]??'docs/qa/mangrove-magic-20261026/shield-abab';
const quantile=(a,q)=>a.length?a[Math.floor((a.length-1)*q)]:null;
const rows=[];
for(const run of ['A1','B1','A2','B2']){
 try{
  const r=JSON.parse(await readFile(`${root}/${run}/raid-ui.json`)),programs=JSON.parse(await readFile(`${root}/${run}/program-waits.json`));
  const frames=r.timing.frames.filter(f=>f.ms>=0),all=frames.map(f=>f.ms).sort((a,b)=>a-b);
  // Include a frame spanning the click, and the following second. Long
  // stalls can end outside that second; interval overlap keeps them visible.
  const activation=frames.filter(f=>f.t>=r.clickStart&&f.t-f.ms<=r.clickStart+1000).map(f=>f.ms);
  rows.push({run,ok:r.ok,elapsedBefore:r.before?.state?.elapsed,activeActorsBefore:r.before?.state?.raid?.animals?.length,clickRoundtripMs:r.clickEnd-r.clickStart,frameSamples:all.length,p50:quantile(all,.5),p95:quantile(all,.95),p99:quantile(all,.99),max:all.at(-1),activationMax:activation.length?Math.max(...activation):null,programQueries:programs.length,programWaitMs:programs.reduce((s,p)=>s+p.ms,0),programs:programs.map(p=>({ms:p.ms,afterClickMs:p.start-r.clickStart,draw:p.draw})),errors:r.errors});
 }catch(e){if(e.code==='ENOENT')rows.push({run,pending:true});else throw e;}
}
const result={scope:'Real renderer, same final-ten save, medium 1280x720, fresh Chrome per trial; A original lights / B stable lights. CPU sampling and video active in all trials. Call latency is not GPU time. Wall-clock activation can include automation overhead. No sustained GPU conclusion.',rows};
await writeFile(`${root}/summary.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(rows.map(({programs,...r})=>r),null,2));
