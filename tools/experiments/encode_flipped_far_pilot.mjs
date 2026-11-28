// One experimental preflipped prelit atlas. Does not modify the batch or game.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {packNativeBc7} from './pack_native_bc7.mjs';
const require=createRequire(import.meta.url),sharp=require('sharp'),{chromium}=require(process.env.PLAYWRIGHT_MODULE??'playwright'),{encodeToKTX2}=await import(pathToFileURL(resolve('.cache/tooling/ktx2-encoder/package/dist/node/index.js')));
const input='public/assets/far-vegetation/canyons-0-day.webp',output='public/qa/ktx2-fixture/far-canyons-day-flipped-bc7.ktx2',bytes=await readFile(input),sourceSha256=createHash('sha256').update(bytes).digest('hex');
const basis=await encodeToKTX2(bytes,{isUASTC:true,uastcLDRQualityLevel:2,isInputSRGB:true,isSetKTX2SRGBTransferFunc:true,generateMipmap:true,imageDecoder:async data=>{const {data:raw,info}=await sharp(data).flip().ensureAlpha().raw().toBuffer({resolveWithObject:true});return {data:new Uint8Array(raw),width:info.width,height:info.height};}});
const browser=await chromium.launch({channel:'msedge',headless:true,args:process.env.QA_NATIVE_GPU==='1'?[]:['--enable-unsafe-swiftshader']});
try{const page=await browser.newPage();await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/tests/browser/ktx2-offline-bc7.html`);await page.waitForFunction(()=>window.offlineBc7Ready||window.offlineBc7Error,null,{timeout:60000});const result=await page.evaluate(data=>window.transcodeBc7(data),Buffer.from(basis).toString('base64'));if(result.colorSpace!=='srgb')throw Error('Unexpected transfer function');const packed=packNativeBc7({...result,levels:result.levels.map(level=>({...level,data:new Uint8Array(Buffer.from(level.data,'base64'))}))});await mkdir(resolve('public/qa/ktx2-fixture'),{recursive:true});await writeFile(output,packed);console.log(JSON.stringify({input,sourceSha256,output,bytes:packed.length,flipY:true,format:'BC7 sRGB, offline UASTC quality 2',scope:'Experimental one-atlas orientation pilot; no game integration.'}));}finally{await browser.close();}
