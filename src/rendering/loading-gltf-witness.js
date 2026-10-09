// Smoke-only attribution. Preserve the loader callbacks and ordinary parse path.
export function observeLoadingGltf(loader,witness,now=()=>performance.now()){
 if(!witness)return;
 const parse=loader.parse;
 loader.parse=function(data,path,onLoad,onError){
  const start=now(),label='asset-gltf-parse:'+path+':'+(data?.byteLength??0);let completed=false;
  const emit=span=>{try{witness(span);}catch{}};
  try{witness.onBegin?.({label,start,bytes:data?.byteLength??null,scope:'GLTF parse begins after FileLoader has collected the response body.'});}catch{}
  const finish=failed=>{if(completed)return;completed=true;const end=now();emit({label,start,end,duration:end-start,failed,bytes:data?.byteLength??null,scope:'Awaited GLTF parse/decode/material preparation after response collection; excludes primary GLB transfer, includes nested image fetch/decode.'});};
  try{return parse.call(this,data,path,function(...args){finish(false);return onLoad?.apply(this,args);},function(...args){finish(true);return onError?.apply(this,args);});}
  catch(error){finish(true);throw error;}
  finally{const end=now();emit({label:'asset-gltf-parse-submit:'+path+':'+(data?.byteLength??0),start,end,duration:end-start,scope:'Synchronous GLTF parse invocation; nested within awaited parse, do not sum.'});}
 };
}
