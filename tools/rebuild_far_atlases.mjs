import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {validateFarAtlasRecipe} from './experiments/far-atlas-recipe.js';

export const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function equivalentNativeFrame(a,b){
 if(typeof a==='number'&&typeof b==='number')return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-12;
 if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((value,i)=>equivalentNativeFrame(value,b[i]));
 if(a&&b&&typeof a==='object'&&typeof b==='object')return Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(key=>Object.hasOwn(b,key)&&equivalentNativeFrame(a[key],b[key]));
 return a===b;
}
export function admitReviewedAtlasSources(manifest,reviewed,metadata){
 const expected=Object.entries(reviewed.biomes).flatMap(([biome,species])=>species.flatMap(s=>['day','night'].map(phase=>`${biome}-${s.slot}-${phase}`))).sort();
 const actual=manifest.records.map(r=>`${r.biome}-${r.slot}-${r.phase}`).sort();
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Missing, duplicate or unexpected atlas records');
 for(const [biome,species] of Object.entries(reviewed.biomes))for(const reference of species){
  const pair=['day','night'].map(phase=>{
   const record=manifest.records.find(r=>r.biome===biome&&r.slot===reference.slot&&r.phase===phase);
   if(record.publicPath!==`public/${reference[phase].replace(/^\.\//,'')}`)throw Error('Changed atlas destination');
   if(record.encoder!==(reference.prelitAlphaEncoding?'pillow-exact':'sharp-lossless'))throw Error('Changed atlas encoder');
   const bake=metadata[record.metadata];
   if(bake?.elevation?.elevationDegrees!==reviewed.elevationDegrees||bake?.viewResolution!==reviewed.resolution)throw Error('Changed bake elevation/resolution');
   return bake;
  });
  validateFarAtlasRecipe(...pair,reference,reviewed.sunPosition);
 }
}
export async function rebuildReviewedAtlasSources({root=process.cwd(),output=null,writePublic=false}={}){
 root=path.resolve(root);
 const sources=path.join(root,'tools/sources/far-atlases'),manifestPath=path.join(sources,'manifest.json');
 const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
 const reviewedBytes=await fs.readFile(path.join(root,'public/content/far-vegetation.json'));
 if(sha256(reviewedBytes)!==manifest.publicManifestSha256)throw Error('Reviewed public manifest hash differs');
 const reviewed=JSON.parse(reviewedBytes);
 for(const [key,version] of [['sharp',manifest.versions.sharp],['vips',manifest.versions.vips],['webp',manifest.versions.sharpWebp]])if(sharp.versions[key]!==version)throw Error(`Requires ${key} ${version}`);
 const helper=path.join(root,'tools/far_atlas_source.py');
 const cache=path.join(root,'.cache');await fs.mkdir(cache,{recursive:true});
 const temporary=await fs.mkdtemp(path.join(cache,'far-source-'));
 try{
  execFileSync('python',[helper,'extract',manifestPath,path.join(sources,manifest.archive),temporary],{stdio:'pipe'});
  const metadata={},inputs=new Map(),originals=new Map();
  // Admit all source hashes, frame/lighting/alpha recipes and public bytes first.
  for(const record of manifest.records){
   const meta=await fs.readFile(path.join(temporary,record.metadata));
   if(sha256(meta)!==record.metadataSha256)throw Error('Changed atlas metadata');
   metadata[record.metadata]=JSON.parse(meta);
   const originalMetadata=await fs.readFile(path.join(temporary,record.originalNativeMetadata));
   if(sha256(originalMetadata)!==record.originalNativeMetadataSha256)throw Error('Changed original native metadata');
   const native=JSON.parse(originalMetadata),normalized=metadata[record.metadata];
   for(const key of ['slot','species','views','rotationViews','atlasWidth','atlasHeight','bakedLod','elevationDegrees','elevation','viewResolution','localBase','impostorWidth','impostorHeight','sourceBounds','baseV','sunPosition','nativeSunDirection','bakedPhase'])if(!equivalentNativeFrame(native[key],normalized[key]))throw Error(`Native metadata differs: ${key}`);
   const input=record.inputStorage==='archive'?path.join(temporary,record.input):path.join(root,record.input);
   const bytes=await fs.readFile(input);
   if(sha256(bytes)!==record.inputSha256)throw Error('Changed atlas PNG input');
   const original=await fs.readFile(path.join(root,record.publicPath));
   if(sha256(original)!==record.outputSha256)throw Error('Changed reviewed public atlas');
   inputs.set(record,input);originals.set(record,original);
  }
  admitReviewedAtlasSources(manifest,reviewed,metadata);
  const generated=[];
  for(const record of manifest.records){
   let bytes;
   if(record.encoder==='pillow-exact'){
    const staged=path.join(temporary,`${record.biome}-${record.slot}-${record.phase}.webp`);
    execFileSync('python',[helper,'encode',inputs.get(record),staged],{stdio:'pipe'});bytes=await fs.readFile(staged);
   }else bytes=await sharp(inputs.get(record)).webp({lossless:true,effort:6}).toBuffer();
   if(sha256(bytes)!==record.outputSha256||bytes.length!==record.outputBytes)throw Error('Regenerated atlas is not byte-exact');
   const decode=async image=>sharp(image).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   const [actual,expected]=await Promise.all([decode(bytes),decode(originals.get(record))]);
   if(actual.info.width!==1024||actual.info.height!==1024||!actual.data.equals(expected.data))throw Error('Decoded atlas RGBA differs');
   generated.push({record,bytes,rgbaSha256:sha256(actual.data)});
  }
  // No public/output writes until all 44 generations and decodes are verified.
  if(output){await fs.mkdir(path.resolve(root,output),{recursive:true});for(const {record,bytes} of generated)await fs.writeFile(path.join(path.resolve(root,output),path.basename(record.publicPath)),bytes);}
  if(writePublic)for(const {record,bytes} of generated)await fs.writeFile(path.join(root,record.publicPath),bytes);
  return {passed:true,count:generated.length,publicWrites:writePublic,archiveSha256:manifest.archiveSha256,versions:manifest.versions,atlases:generated.map(({record,rgbaSha256})=>({path:record.publicPath,sha256:record.outputSha256,rgbaSha256,bytes:record.outputBytes}))};
 }finally{
  if(path.dirname(temporary)!==cache)throw Error('Temporary atlas directory escaped its cache');
  await fs.rm(temporary,{recursive:true,force:true});
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),outputIndex=args.indexOf('--output');
 const result=await rebuildReviewedAtlasSources({output:outputIndex<0?null:args[outputIndex+1],writePublic:args.includes('--write-public')});
 console.log(JSON.stringify(result,null,2));
}
