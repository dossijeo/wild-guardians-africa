import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const outputUrl=value=>{
 const url=new URL(value);
 if(url.protocol!=='https:'||url.hostname!=='api.tinify.com'||url.port||url.username||url.password||!url.pathname.startsWith('/output/')||url.search||url.hash)throw Error('Unexpected Tinify output location');
 return url.href;
};
const exists=async file=>{try{return await readFile(file);}catch(error){if(error.code==='ENOENT')return null;throw error;}};

// Only the private cache stores provider locations. Receipts are safe to publish.
// A completed output is reused by source hash; an interrupted download resumes
// its known upload instead of sending the source again. No credentials in errors.
export class TinifyImageCache {
 #authorization;
 constructor({key,cacheDirectory,fetchImpl=fetch}){
  if(typeof key!=='string'||!key.trim())throw Error('TINIFY_API_KEY is required');
  this.#authorization='Basic '+Buffer.from('api:'+key.trim()).toString('base64');
  this.directory=resolve(cacheDirectory);this.fetch=fetchImpl;this.pending=new Map();
 }
 async #request(url,options){
  let response;try{response=await this.fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(30000),headers:{...options.headers,Authorization:this.#authorization}});}
  catch{throw Error('Tinify network request failed; private cache retained for resume');}
  if(!response.ok)throw Error('Tinify HTTP '+response.status+'; private cache retained for resume');
  return response;
 }
 optimize(bytes,{format}={}){
  if(!['png','jpeg','webp'].includes(format))throw Error('Pilot supports static PNG/JPEG/WebP only');
  const sourceHash=sha(bytes),key=sourceHash+'-webp-v1';
  if(this.pending.has(key))return this.pending.get(key);
  const pending=this.run(Buffer.from(bytes),format,sourceHash,key);
  this.pending.set(key,pending);pending.finally(()=>{if(this.pending.get(key)===pending)this.pending.delete(key);}).catch(()=>{});return pending;
 }
 async run(bytes,format,sourceHash,key){
  const dir=resolve(this.directory,key),receiptPath=resolve(dir,'receipt.json'),outputPath=resolve(dir,'output.webp'),journalPath=resolve(dir,'upload.json');
  await mkdir(dir,{recursive:true});
  const storedReceipt=await exists(receiptPath),storedOutput=await exists(outputPath);
  if(storedReceipt&&storedOutput){
   const receipt=JSON.parse(storedReceipt);if(receipt.sourceSha256!==sourceHash||receipt.outputSha256!==sha(storedOutput))throw Error('Tinify cache integrity mismatch');
   return {bytes:storedOutput,receipt,reused:true};
  }
  let journal=JSON.parse(await exists(journalPath)??'null');
  if(journal&&journal.sourceSha256!==sourceHash)throw Error('Tinify upload cache integrity mismatch');
  if(!journal){
   const response=await this.#request('https://api.tinify.com/shrink',{method:'POST',body:bytes});
   const location=outputUrl(response.headers.get('location'));
   journal={sourceSha256:sourceHash,location,compressionCount:response.headers.get('compression-count')};
   await writeFile(journalPath,JSON.stringify(journal)+'\n');
  }
  const location=outputUrl(journal.location),options=format==='webp'?{method:'GET'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({convert:{type:'image/webp'}})};
  const response=await this.#request(location,options),output=Buffer.from(await response.arrayBuffer());
  if(response.headers.get('content-type')?.split(';')[0]!=='image/webp'||output.subarray(0,4).toString()!=='RIFF'||output.subarray(8,12).toString()!=='WEBP')throw Error('Tinify did not return a WebP image');
  const receipt={provider:'Tinify',sourceSha256:sourceHash,sourceBytes:bytes.length,outputSha256:sha(output),outputBytes:output.length,sourceFormat:format,outputFormat:'webp',compressionCount:response.headers.get('compression-count')??journal.compressionCount};
  await writeFile(outputPath,output);await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');
  return {bytes:output,receipt,reused:false};
 }
}
