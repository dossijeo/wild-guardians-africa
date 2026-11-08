// QA-only instrumentation. Payload accounting traverses objects and therefore
// changes timing; its results must not be used to claim frame-time gains.
export function instrumentGrassQueue(source){
 const replacements=[
  ['let closed=false,nextId=0,active=null;const queued=new Map();',`let closed=false,nextId=0,active=null;const queued=new Map();
 const qa={submissions:0,cloneMs:[],measureMs:[],postMs:[],roundTripMs:[],resultBytes:[],requestBytes:[],peakRetainedBytes:0,peakQueued:0};
 function qaPeak(){qa.peakQueued=Math.max(qa.peakQueued,queued.size);qa.peakRetainedBytes=Math.max(qa.peakRetainedBytes,(active?.qaBytes??0)+[...queued.values()].reduce((sum,item)=>sum+item.qaBytes,0));}`],
  ['try {worker.postMessage({id:job.id,request:job.request});}',"try {const t=performance.now();job.qaPostedAt=performance.timeOrigin+t;worker.postMessage({id:job.id,request:job.request});qa.postMs.push(performance.now()-t);qaPeak();}"],
  ['const job=active;active=null;',"const job=active;active=null;qa.roundTripMs.push(performance.timeOrigin+performance.now()-job.qaPostedAt);if(data.result)qa.resultBytes.push((data.result.anchors?.byteLength??0)+(data.result.values?.byteLength??0)+(data.result.slopes?.byteLength??0));"],
  ['const snapshot=structuredClone(request),id=++nextId;',"const cloneStart=performance.now(),snapshot=structuredClone(request),cloneMs=performance.now()-cloneStart,measureStart=performance.now(),qaBytes=estimateRetainedBytes(snapshot),measureMs=performance.now()-measureStart,id=++nextId;qa.submissions++;qa.cloneMs.push(cloneMs);qa.measureMs.push(measureMs);qa.requestBytes.push(qaBytes);"],
  ['queued.set(key,{id,key,request:snapshot,resolve,reject,stale:false});pump();','queued.set(key,{id,key,request:snapshot,resolve,reject,stale:false,qaBytes});qaPeak();pump();'],
  ['status(){return {closed,active:active?1:0,queued:queued.size};}','status(){return {closed,active:active?1:0,queued:queued.size,qaTransfer:structuredClone(qa)};}']
 ];
 for(const [before,after] of replacements){if(source.split(before).length!==2)throw Error('Grass queue instrumentation anchor missing: '+before);source=source.replace(before,after);}
 return "import {estimateRetainedBytes} from '/src/simulation/retained-size.js';\n"+source;
}
