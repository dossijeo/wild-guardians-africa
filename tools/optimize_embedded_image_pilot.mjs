// Explicit one-image pilot. Writes only ignored cache candidates, never runtime.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {prepareEmbeddedColorInput} from './embedded-color-input.mjs';
import {replaceWebGlbColorImages} from './repack_web_glb_images.mjs';
import {TinifyImageCache} from './tinify-image-cache.mjs';
import {compareColorPixels} from './image-pixel-comparison.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
try{
 const [path,indexText,...extra]=process.argv.slice(2);
 if(extra.length||!path||!/^\d+$/.test(indexText??''))throw Error('Usage: node tools/optimize_embedded_image_pilot.mjs MANIFEST_RUNTIME_GLB IMAGE_INDEX');
 const manifest=JSON.parse(await readFile(resolve(root,'content/manifests/web-assets.json'),'utf8')),record=manifest.records.find(record=>record.runtime===path);
 if(!record||![record.source,record.runtime].every(path=>/^assets\/(?:web\/)?[a-f0-9]{64}\.glb$/.test(path)))throw Error('Pilot requires a manifest-owned model');
 const [original,runtime]=await Promise.all([readFile(resolve(root,'public',record.source)),readFile(resolve(root,'public',record.runtime))]);
 if(sha(original)!==record.sourceSha256||sha(runtime)!==record.runtimeSha256)throw Error('GLB manifest integrity mismatch');
 const index=Number(indexText),prepared=await prepareEmbeddedColorInput(original,runtime,index);
 const client=new TinifyImageCache({key:process.env.TINIFY_API_KEY,cacheDirectory:resolve(root,'.cache/tinify-images')});
 const optimized=await client.optimize(prepared.bytes,{format:prepared.format});
 const [originalComparison,runtimeComparison]=await Promise.all([compareColorPixels(prepared.bytes,optimized.bytes),compareColorPixels(prepared.runtimeImage,optimized.bytes)]);
 const candidate=await replaceWebGlbColorImages(runtime,new Map([[index,optimized.bytes]]));
 const report={runtimePath:record.runtime,sourcePath:record.source,...prepared.provenance,...optimized.receipt,reused:optimized.reused,originalComparison,runtimeComparison,savedImageBytes:prepared.runtimeImage.length-optimized.bytes.length,beforeGlbBytes:runtime.length,candidateGlbBytes:candidate.length,savedRuntimeBytes:runtime.length-candidate.length,candidateGlbSha256:sha(candidate),acceptedForRuntime:false,scope:'Actual Tinify pilot from original embedded color at existing runtime resolution. Candidate GLB only; no distributed asset/manifest changed. Requires native visual and package acceptance; not RAM/GPU/frametime evidence.'};
 const directory=resolve(root,'.cache/tinify-embedded-pilot',prepared.provenance.originalImageSha256+'-'+index);await mkdir(directory,{recursive:true});
 await writeFile(resolve(directory,'input.png'),prepared.bytes);await writeFile(resolve(directory,'candidate.webp'),optimized.bytes);await writeFile(resolve(directory,'candidate.glb'),candidate);await writeFile(resolve(directory,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}catch(error){console.error(error.message);process.exitCode=1;}
