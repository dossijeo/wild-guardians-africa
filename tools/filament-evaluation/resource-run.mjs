import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;if(!modulePath)throw Error('Set WG_QA_PLAYWRIGHT_MODULE');
const {chromium}=await import(pathToFileURL(modulePath).href);
const out='docs/qa/filament-evaluation/resource-controls';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const scenario of ['A','B','C'])for(const backend of ['three','filament']){
 const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
 try{await page.goto(`http://127.0.0.1:5296/tools/filament-evaluation/benchmark.html?scenario=${scenario}&backend=${backend}&native=1`);await page.waitForFunction(()=>window.benchReady||window.benchFailed,null,{timeout:180000});if(await page.evaluate(()=>window.benchFailed))throw Error(await page.evaluate(()=>window.benchErrors.join('\n')));
 const raw=await page.evaluate(()=>window.bench.rawCadence({frames:300,warmup:120}));
 const resources=await page.evaluate(()=>window.bench.resourceProbe());
 const cleanup=await page.evaluate(()=>window.bench.dispose());
 await writeFile(`${out}/${scenario}-${backend}.json`,JSON.stringify({raw,resources,cleanup},null,2)+'\n');console.log(JSON.stringify({scenario,backend,raw:{...raw,rows:undefined},resources:resources.summary,cleanupMs:cleanup.ms}));
 }finally{await page.close()}
}}finally{await browser.close()}
