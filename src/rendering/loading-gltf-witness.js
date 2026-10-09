// Smoke-only attribution. Preserve loader callbacks and the ordinary parse path.
export function observeLoadingGltf(loader,witness,now=()=>performance.now()){
 if(!witness)return;
 const clock=()=>{try{return now();}catch{return null;}},emit=span=>{try{witness(span);}catch{}},parse=loader.parse,load=loader.load;
 let delivery=null;
 // The parse callback synchronously calls GLTFLoader's request-specific load
 // callback. Associate only that exact delivery; URL/path/byte-size guesses are
 // unsafe when concurrent requests share a resource path or body size.
 const deliver=(record,failed,callback,receiver,args)=>{
  const previous=delivery;delivery={record,failed,value:args[0],claimed:false};
  try{return callback?.apply(receiver,args);}finally{delivery=previous;}
 };
 if(typeof load==='function')loader.load=function(url,onLoad,onProgress,onError,...rest){
  const start=clock(),progress={count:0,firstAt:null,lastAt:null,loaded:null,total:null,lengthComputable:null,callbackCpuMs:0,maxCallbackCpuMs:0,callbackFailures:0};let finished=false;
  const complete=(failed,args)=>{
   if(finished)return;finished=true;
   const associated=delivery&&!delivery.claimed&&delivery.failed===failed&&delivery.value===args[0]?delivery:null;if(associated)associated.claimed=true;
   const end=clock(),record=associated?.record;
   emit({label:'asset-gltf-progress:'+(typeof url==='string'?url:'(non-string)'),start,end,duration:start===null||end===null?null:end-start,failed,...progress,parseStart:record?.start??null,parseBytes:record?.bytes??null,lastProgressToParseMs:record?.start!=null&&progress.lastAt!=null?record.start-progress.lastAt:null,association:record?'Exact synchronous parse callback delivery into this request callback':'No exact parse callback delivery; no URL/path/size inference',scope:'Existing progress callback deliveries and original callback CPU; delivery scheduling/collection is not physical transport time. One bounded summary per completed GLB request.'});
  };
  const forward=(callback,failed)=>typeof callback==='function'?function(...args){complete(failed,args);return callback.apply(this,args);}:callback;
  const progressCallback=typeof onProgress==='function'?function(...args){
   const at=clock();try{progress.count++;progress.firstAt??=at;progress.lastAt=at;const event=args[0];progress.loaded=typeof event?.loaded==='number'?event.loaded:null;progress.total=typeof event?.total==='number'?event.total:null;progress.lengthComputable=typeof event?.lengthComputable==='boolean'?event.lengthComputable:null;}catch{}
   const begin=clock();let failed=false;try{return onProgress.apply(this,args);}catch(error){failed=true;throw error;}finally{const end=clock();if(begin!==null&&end!==null){const cpu=end-begin;progress.callbackCpuMs+=cpu;progress.maxCallbackCpuMs=Math.max(progress.maxCallbackCpuMs,cpu);}if(failed)progress.callbackFailures++;}
  }:onProgress;
  try{return load.call(this,url,forward(onLoad,false),progressCallback,forward(onError,true),...rest);}catch(error){complete(true,[error]);throw error;}
 };
 loader.parse=function(data,path,onLoad,onError){
  const start=clock(),bytes=data?.byteLength??null,label='asset-gltf-parse:'+path+':'+(bytes??0),record={start,bytes};let completed=false;
  try{witness.onBegin?.({label,start,bytes,scope:'GLTF parse begins after FileLoader has collected the response body.'});}catch{}
  const finish=failed=>{if(completed)return;completed=true;const end=clock();emit({label,start,end,duration:start===null||end===null?null:end-start,failed,bytes,scope:'Awaited GLTF parse/decode/material preparation after response collection; excludes primary GLB transfer, includes nested image fetch/decode.'});};
  try{return parse.call(this,data,path,function(...args){finish(false);return deliver(record,false,onLoad,this,args);},function(...args){finish(true);return deliver(record,true,onError,this,args);});}
  catch(error){finish(true);throw error;}
  finally{const end=clock();emit({label:'asset-gltf-parse-submit:'+path+':'+(bytes??0),start,end,duration:start===null||end===null?null:end-start,scope:'Synchronous GLTF parse invocation; nested within awaited parse, do not sum.'});}
 };
}
