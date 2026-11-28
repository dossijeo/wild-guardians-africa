import fs from 'node:fs';
import {createHash} from 'node:crypto';

export function nativeTraceOptions(env=process.env){
 const mb=Number(env.QA_NATIVE_TRACE_BUFFER_MB??512);
 if(!Number.isSafeInteger(mb)||mb<1||mb>1024)throw Error('QA_NATIVE_TRACE_BUFFER_MB must be an integer from 1 to 1024');
 const categories=(env.QA_NATIVE_TRACE_CATEGORIES??'toplevel,blink,blink.user_timing,devtools.timeline,v8.execute,gpu,viz,cc').split(',').map(s=>s.trim()).filter(Boolean);
 if(!categories.length)throw Error('Native trace requires explicit categories');
 return {traceConfig:{recordMode:'recordUntilFull',traceBufferSizeInKb:mb*1024,includedCategories:categories},
  transferMode:'ReturnAsStream',streamFormat:'json',streamCompression:'gzip',bufferUsageReportingInterval:1000};
}

// One CDP recording in the original auditor, with a bounded browser buffer
// and a streamed file export. No replay, sampling or deletion of bad frames.
export async function startNativeAuditTrace(browser,{output,env=process.env}){
 if(!output?.endsWith('.json'))throw Error('Native trace output must end in .json');
 const tracePath=output.replace(/\.json$/,'.trace.json.gz'),completionPath=output.replace(/\.json$/,'.trace-complete.json');
 if([tracePath,output.replace(/\.json$/,'.trace.json'),completionPath].some(p=>fs.existsSync(p)))throw Error('Native trace output already exists');
 const session=await browser.newBrowserCDPSession(),options=nativeTraceOptions(env),browserVersion=browser.version();
 let peakBufferUsage=null,usageReports=0,stopPromise;
 session.on('Tracing.bufferUsage',value=>{const fraction=value.percentFull??value.value;if(Number.isFinite(fraction)){peakBufferUsage=Math.max(peakBufferUsage??0,fraction);usageReports++;}});
 const completed=new Promise(resolve=>session.once('Tracing.tracingComplete',resolve));
 await session.send('Tracing.start',options);
 return {stop(){return stopPromise??=(async()=>{
  await session.send('Tracing.end');const {stream,...completion}=await completed;
  const metadata={...completion,browserVersion,options,peakBufferUsage,usageReports,collectionComplete:false,tracePath,exportedBytes:0};
  const hash=createHash('sha256');
  try{
   if(!stream)throw Error('Native birth trace has no stream');
   try{
    if(completion.traceFormat!=='json'||completion.streamCompression!=='gzip')throw Error('Native trace stream format does not match its requested compressed JSON');
    async function* chunks(){for(;;){const item=await session.send('IO.read',{handle:stream,size:1024*1024});const bytes=Buffer.from(item.data,item.base64Encoded?'base64':'utf8');metadata.exportedBytes+=bytes.length;hash.update(bytes);yield bytes;if(item.eof)break;}}
    const file=await fs.promises.open(tracePath,'wx');
    try{for await(const bytes of chunks())await file.writeFile(bytes);}
    finally{await file.close();}
   }finally{await session.send('IO.close',{handle:stream});}
   if(!metadata.exportedBytes)throw Error('Native trace stream is empty');
   metadata.sha256=hash.digest('hex');metadata.collectionComplete=true;
   if(completion.dataLossOccurred!==false)throw Error('Native birth trace did not establish loss-free completion');
   return metadata;
  }catch(error){metadata.collectionError=String(error);throw error;}
  finally{fs.writeFileSync(completionPath,JSON.stringify(metadata,null,2)+'\n',{flag:'wx'});}
 })();}};
}
