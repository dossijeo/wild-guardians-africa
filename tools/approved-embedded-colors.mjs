import {createHash} from 'node:crypto';
import {prepareEmbeddedColorInput} from './embedded-color-input.mjs';
import {replaceWebGlbColorImages} from './repack_web_glb_images.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

// Reviewed encoder output is kept outside public/ so rebuilding needs no API
// credential/network request and the package never contains a duplicate image.
export async function applyApprovedEmbeddedColors(original,baseline,source,recipes,load){
 if(recipes.version!==1||!Array.isArray(recipes.images))throw Error('Invalid approved embedded color recipes');
 const replacements=new Map(),applied=[];
 for(const entry of recipes.images.filter(entry=>entry.source===source)){
  if(!Number.isSafeInteger(entry.index)||entry.index<0||replacements.has(entry.index))throw Error('Invalid or duplicate approved image index');
  if(!/^[a-f0-9]{64}$/.test(entry.outputSha256)||entry.file!=='content/optimized-images/'+entry.outputSha256+'.webp')throw Error('Invalid approved image file');
  if(hash(original)!==entry.originalGlbSha256||hash(baseline)!==entry.baselineGlbSha256)throw Error('Approved image GLB source/baseline changed');
  const prepared=await prepareEmbeddedColorInput(original,baseline,entry.index);
  if(prepared.provenance.originalImageSha256!==entry.originalImageSha256||prepared.provenance.uploadSha256!==entry.uploadSha256)throw Error('Approved image preparation changed');
  const output=await load(entry.file);
  if(hash(output)!==entry.outputSha256||output.length!==entry.outputBytes)throw Error('Approved image output integrity mismatch');
  replacements.set(entry.index,output);applied.push(entry);
 }
 return {bytes:await replaceWebGlbColorImages(baseline,replacements),applied};
}
