import {writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
export async function startPresentationTrace(browser,page,out){
 const session=await browser.newBrowserCDPSession();
 const categories='toplevel,devtools.timeline,blink.user_timing,cc,gpu,viz,benchmark';
 await session.send('Tracing.start',{categories,transferMode:'ReturnAsStream'});
 await page.evaluate(()=>performance.mark('wg-stream-trace-start'));
 let stopped=false;
 return async()=>{
  if(stopped)return;stopped=true;
  await page.evaluate(()=>performance.mark('wg-stream-trace-end')).catch(()=>{});
  const complete=new Promise(resolve=>session.once('Tracing.tracingComplete',resolve));
  await session.send('Tracing.end');const result=await complete;
  if(!result.stream)throw Error('Missing trace stream');
  const chunks=[];let size=0;
  try{for(;;){const part=await session.send('IO.read',{handle:result.stream,size:1048576});const bytes=Buffer.from(part.data,part.base64Encoded?'base64':'utf8');size+=bytes.length;if(size>256*1024*1024)throw Error('Diagnostic trace exceeds 256 MiB limit');chunks.push(bytes);if(part.eof)break;}}
  finally{await session.send('IO.close',{handle:result.stream});await session.detach();}
  const bytes=Buffer.concat(chunks);await writeFile(out+'/presentation-trace.json.gz',gzipSync(bytes));
  return {bytes:size,dataLossOccurred:result.dataLossOccurred??false,categories,scope:'Diagnostic trace including instrumentation overhead; not an acceptance benchmark.'};
 };
}
