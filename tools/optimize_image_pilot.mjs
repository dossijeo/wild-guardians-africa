// Explicit one-image pilot, never a runtime asset replacement.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {TinifyImageCache} from './tinify-image-cache.mjs';
import {compareColorPixels} from './image-pixel-comparison.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
try{
 const [path,...extra]=process.argv.slice(2);if(!path||extra.length)throw Error('Usage: node tools/optimize_image_pilot.mjs INVENTORIED_PUBLIC_IMAGE_PATH');
 const inventory=JSON.parse(await readFile(resolve(root,'.cache/image-inventory.json'),'utf8'));
 const item=inventory.standalone.find(r=>r.path===path&&r.distributed);
 if(!item||item.requiresExactPixels||item.roles.some(role=>role!=='color')||item.pages!==1)throw Error('Pilot requires an inventoried static color image; data/unknown images are excluded');
 const sourcePath=resolve(root,'public',path);if(!sourcePath.startsWith(resolve(root,'public')+sep))throw Error('Image path escapes public directory');
 const input=await readFile(sourcePath);if(sha(input)!==item.sha256)throw Error('Image inventory is stale');
 const sourceInfo=await sharp(input).metadata();if((sourceInfo.orientation??1)!==1)throw Error('Pilot requires separate orientation review before upload');
 const client=new TinifyImageCache({key:process.env.TINIFY_API_KEY,cacheDirectory:resolve(root,'.cache/tinify-images')});
 const optimized=await client.optimize(input,{format:item.format}),outputInfo=await sharp(optimized.bytes).metadata();
 const comparison=await compareColorPixels(input,optimized.bytes);
 const report={sourcePath:path,...optimized.receipt,reused:optimized.reused,before:{width:sourceInfo.width,height:sourceInfo.height,alpha:sourceInfo.hasAlpha,icc:!!sourceInfo.icc,orientation:sourceInfo.orientation??null},after:{width:outputInfo.width,height:outputInfo.height,alpha:outputInfo.hasAlpha,icc:!!outputInfo.icc,orientation:outputInfo.orientation??null},...comparison,savedBytes:input.length-optimized.bytes.length,structuralChecksPassed:comparison.dimensionsMatch&&comparison.alphaDifferences===0&&(outputInfo.orientation??1)===1,acceptedForRuntime:false,scope:'Actual Tinify color pilot and decoded-pixel comparison. Visual review and game/native rendering remain required; no runtime asset or reference was replaced.'};
 const directory=resolve(root,'.cache/tinify-pilot',item.sha256);await mkdir(directory,{recursive:true});
 await writeFile(resolve(directory,'candidate.webp'),optimized.bytes);await writeFile(resolve(directory,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}catch(error){console.error(error.message);process.exitCode=1;}
