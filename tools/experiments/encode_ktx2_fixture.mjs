// Isolated fixture only. Install ktx2-encoder 0.6.0 under .cache/tooling as
// documented in the audit; no game resource or production dependency changes.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),sharp=require('sharp');
const [source,target,mode='etc1s']=process.argv.slice(2);
if(!source||!target||!['etc1s','uastc'].includes(mode))throw Error('Usage: node encode_ktx2_fixture.mjs source target etc1s|uastc');
const {encodeToKTX2}=await import(pathToFileURL(resolve('.cache/tooling/ktx2-encoder/package/dist/node/index.js')));
const input=await readFile(source),started=performance.now();
const result=await encodeToKTX2(input,{isUASTC:mode==='uastc',isInputSRGB:true,isSetKTX2SRGBTransferFunc:true,generateMipmap:true,qualityLevel:180,imageDecoder:async bytes=>{const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {data:new Uint8Array(data),width:info.width,height:info.height};}});
await mkdir(dirname(target),{recursive:true});await writeFile(target,result);console.log(JSON.stringify({source,target,mode,inputBytes:input.length,outputBytes:result.length,encodeMs:performance.now()-started}));
