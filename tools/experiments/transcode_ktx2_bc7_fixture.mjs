import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE??'playwright');
import {packNativeBc7} from './pack_native_bc7.mjs';
const [input,output]=process.argv.slice(2);if(!/^[a-z0-9-]+\.ktx2$/.test(input??'')||!output)throw Error('Usage: node transcode_ktx2_bc7_fixture.mjs fixture-name.ktx2 output.ktx2');
const browser=await chromium.launch({channel:'msedge',headless:true,args:process.env.QA_NATIVE_GPU==='1'?[]:['--enable-unsafe-swiftshader']});
try{const page=await browser.newPage();await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/tests/browser/ktx2-offline-bc7.html?name=${encodeURIComponent(input)}`);await page.waitForFunction(()=>window.offlineBc7||window.offlineBc7Error,null,{timeout:180000});const {data,error}=await page.evaluate(()=>({data:window.offlineBc7,error:window.offlineBc7Error}));if(error)throw Error(error);if(data.colorSpace!=='srgb'||!data.levels.length||data.width%4||data.height%4)throw Error('Expected a block-aligned sRGB color texture');
 const bytes=packNativeBc7({...data,levels:data.levels.map(level=>({...level,data:new Uint8Array(Buffer.from(level.data,'base64'))}))});await writeFile(output,bytes);console.log(JSON.stringify({input,output,width:data.width,height:data.height,levels:data.levels.length,bytes:bytes.length,format:'VK_FORMAT_BC7_SRGB_BLOCK',supercompression:0,scope:'Offline conversion from one Basis KTX2 on a BC7-capable browser; target requires EXT_texture_compression_bptc. No runtime transcoder is needed for this file. No cross-device or full game validation.'}));
}finally{await browser.close();}
