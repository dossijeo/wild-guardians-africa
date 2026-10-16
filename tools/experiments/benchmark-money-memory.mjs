// Pass another checkout's money.js to compare the same process workload.
// Repeatedly replaces the same accumulator; old fractions are collectible.
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const moduleUrl=process.argv[2]?pathToFileURL(resolve(process.argv[2])).href:
  new URL('../../src/simulation/money.js',import.meta.url);
const {add,rational}=await import(moduleUrl);
const operations=Number(process.argv[3]??100000);
if(!Number.isSafeInteger(operations)||operations<1)
  throw Error('Operation count must be a positive safe integer');

if(typeof globalThis.gc!=='function')throw Error('Run Node with --expose-gc');
globalThis.gc();
const before=process.memoryUsage(),started=performance.now();
let amount=rational(0),peakRss=before.rss;
for(let i=0;i<operations;i++){
  amount=add(amount,rational(1,7));
  if(i%1000===0)peakRss=Math.max(peakRss,process.memoryUsage().rss);
}
const elapsedMs=performance.now()-started;
peakRss=Math.max(peakRss,process.memoryUsage().rss);
globalThis.gc();
const after=process.memoryUsage();
console.log(JSON.stringify({node:process.version,source:String(moduleUrl),
  operations,elapsedMs,
  beforeHeap:before.heapUsed,afterHeap:after.heapUsed,
  beforeRss:before.rss,afterRss:after.rss,peakSampledRss:peakRss,
  result:amount},null,2));
