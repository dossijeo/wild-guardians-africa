import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;
if(!modulePath)throw Error('Set WG_QA_PLAYWRIGHT_MODULE');
const {chromium}=await import(pathToFileURL(modulePath).href);
const out=process.env.WG_FILAMENT_OUT??'docs/qa/filament-evaluation/results';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const scenarios=(process.env.WG_FILAMENT_SCENARIOS??'A,B,C').split(',');
const order=(process.env.WG_FILAMENT_ORDER??'three,filament,three,filament').split(',');
const samples=Number(process.env.WG_FILAMENT_SAMPLES??40),frames=Number(process.env.WG_FILAMENT_FRAMES??240),warmup=Number(process.env.WG_FILAMENT_WARMUP??90);
const records=[];
try{for(const scenario of scenarios)for(const density of scenario==='C'?(process.env.WG_FILAMENT_DENSITIES??'.5,1,2').split(',').map(Number):[1])for(let run=0;run<order.length;run++){
 const backend=order[run],page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});const consoleMessages=[];
 page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')consoleMessages.push({type:m.type(),text:m.text()})});page.on('pageerror',e=>consoleMessages.push({type:'pageerror',text:String(e)}));
 const prefix=`${scenario}-${density}-${backend}-${run}`;
 try{
  await page.goto(`http://127.0.0.1:5296/tools/filament-evaluation/benchmark.html?scenario=${scenario}&backend=${backend}&density=${density}&native=${process.env.WG_FILAMENT_NATIVE??'0'}&optimized=${process.env.WG_FILAMENT_OPTIMIZED??'0'}`);
  await page.waitForFunction(()=>window.benchReady||window.benchFailed,null,{timeout:180000});
  const error=await page.evaluate(()=>window.benchFailed?window.benchErrors:null);if(error)throw Error(error.join('\n'));
  for(const night of [0,1]){
   const result=await page.evaluate(options=>window.bench.run(options),{night,frames,warmup,samples});
   await page.evaluate(n=>window.bench.capture(1,n),night);await page.screenshot({path:`${out}/${prefix}-${night}.png`,clip:{x:0,y:0,width:1280,height:720}});
   const record={run,...result,consoleMessages:[...consoleMessages]};records.push(record);await writeFile(`${out}/${prefix}-${night}.json`,JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({run,scenario,density,backend,night,summary:result.summary,errors:result.errors.length}));
  }
  const cleanup=await page.evaluate(()=>window.bench.dispose());await writeFile(`${out}/${prefix}-cleanup.json`,JSON.stringify(cleanup,null,2)+'\n');
 }catch(error){const failure={run,scenario,density,backend,error:String(error),consoleMessages,browserErrors:await page.evaluate(()=>window.benchErrors??[]).catch(()=>[])};await page.screenshot({path:`${out}/${prefix}-failed.png`}).catch(()=>{});await writeFile(`${out}/${prefix}-failed.json`,JSON.stringify(failure,null,2)+'\n');console.log(JSON.stringify(failure));if(process.env.WG_FILAMENT_CONTINUE!=='1')throw error;}
 finally{await page.close();}
}}finally{await writeFile(`${out}/index.json`,JSON.stringify({created:new Date().toISOString(),protocol:{order,scenarios,frames,warmup,samples,resolution:[1280,720],dpr:1},records:records.map(({interactive,timed,...r})=>r)},null,2)+'\n');await browser.close();}
