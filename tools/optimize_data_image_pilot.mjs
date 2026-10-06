import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {losslessDataWebp,compareDataPixels} from './lossless-data-image.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
try{
 const paths=process.argv.slice(2);if(!paths.length)throw Error('Usage: node tools/optimize_data_image_pilot.mjs INVENTORIED_PUBLIC_DATA_IMAGE...');
 const inventory=JSON.parse(await readFile(resolve(root,'.cache/image-inventory.json'),'utf8'));
 for(const path of paths){
  const r=inventory.standalone.find(i=>i.path===path&&i.distributed);
  if(!r||!r.roles.length||r.roles.some(role=>!['normal','data'].includes(role)))throw Error('Requires an inventoried normal/data image');
  const source=resolve(root,'public',path);if(!source.startsWith(resolve(root,'public')+sep))throw Error('Data path escapes public');
  const input=await readFile(source);if(sha(input)!==r.sha256)throw Error('Data inventory is stale');
  const directory=resolve(root,'.cache/lossless-data-pilot',r.sha256);await mkdir(directory,{recursive:true});
  const candidatePath=resolve(directory,'candidate.webp');let output,reused=false;
  try{output=await readFile(candidatePath);reused=true;}catch(error){if(error.code!=='ENOENT')throw error;output=(await losslessDataWebp(input)).output;await writeFile(candidatePath,output);}
  const comparison=await compareDataPixels(input,output);if(!comparison.rawPixelsEqual)throw Error('Cached data candidate failed decoded integrity');
  const info=await sharp(output).metadata();if(info.format!=='webp')throw Error('Data candidate is not WebP');const report={sourcePath:path,sourceSha256:sha(input),runtimeSha256:sha(output),beforeBytes:input.length,afterBytes:output.length,width:info.width,height:info.height,hasAlpha:info.hasAlpha,roles:r.roles,encoding:'lossless-webp',recipe:{sharp:sharp.versions.sharp,webp:sharp.versions.webp,effort:6},...comparison,savedBytes:input.length-output.length,smaller:output.length<input.length,reused,acceptedForRuntime:false,scope:'Local exact RGBA8 data conversion, no Tinify lossy conversion or runtime replacement. Native GPU decode/readback required before integration.'};
  await writeFile(resolve(directory,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }
}catch(error){console.error(error.message);process.exitCode=1;}
