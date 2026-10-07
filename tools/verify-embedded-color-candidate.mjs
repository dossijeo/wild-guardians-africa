import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import validator from 'gltf-validator';
import {readGlb} from './glb-container.mjs';
import {decodeWebGlb} from '../public/runtime/glb-legacy.js';
import {prepareEmbeddedColorInput} from './embedded-color-input.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const arrayBuffer=bytes=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
function imageBytes(glb,index){
 const view=glb.json.bufferViews[glb.json.images[index].bufferView];
 return glb.bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
}

// Independent acceptance gate for offline candidates. It never installs assets
// and cannot replace native visual review. Geometry is checked after decoding,
// not inferred from a successful parse or a packed-container validator result.
export async function verifyEmbeddedColorCandidate(originalBytes,runtimeBytes,candidateBytes,index){
 const prepared=await prepareEmbeddedColorInput(originalBytes,runtimeBytes,index);
 const original=readGlb(originalBytes),runtime=readGlb(runtimeBytes),candidate=readGlb(candidateBytes);
 assert.equal(candidate.json.images.length,runtime.json.images.length,'Image count changed');
 for(const field of ['asset','accessors','meshes','nodes','skins','animations','materials','scenes','scene','samplers','textures','extensionsUsed','extensionsRequired'])assert.deepEqual(candidate.json[field],runtime.json[field],'Runtime metadata changed: '+field);
 const decoded=readGlb(await decodeWebGlb(arrayBuffer(candidateBytes)));
 for(const field of ['asset','accessors','meshes','nodes','skins','animations','materials','scenes','scene','samplers'])assert.deepEqual(decoded.json[field],original.json[field],'Original metadata changed: '+field);
 const imageViews=new Set(original.json.images.map(image=>image.bufferView));
 let geometryBytes=0,geometryViews=0,otherImages=0;
 for(const [i,view] of original.json.bufferViews.entries())if(!imageViews.has(i)){
  const other=decoded.json.bufferViews[i];assert.ok(other,'Missing geometry bufferView '+i);
  const source=original.bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength),result=decoded.bin.subarray(other.byteOffset??0,(other.byteOffset??0)+other.byteLength);
  assert.deepEqual(result,source,'Decoded geometry changed: '+i);geometryBytes+=source.length;geometryViews++;
 }
 for(let i=0;i<runtime.json.images.length;i++)if(i!==index){assert.deepEqual(imageBytes(candidate,i),imageBytes(runtime,i),'Unmodified image changed: '+i);otherImages++;}
 const before=await sharp(prepared.bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true}),after=await sharp(imageBytes(candidate,index)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.deepEqual(after.info,before.info,'Decoded image dimensions/format changed');
 let squared=0,max=0,alphaDifferences=0;
 for(let i=0;i<before.data.length;i++){
  const error=Math.abs(before.data[i]-after.data[i]);
  if(i%4===3){if(error)alphaDifferences++;continue;}
  squared+=error*error;max=Math.max(max,error);
 }
 assert.equal(alphaDifferences,0,'Alpha changed');
 const rmse=Math.sqrt(squared/(before.data.length*.75)),psnr=rmse?20*Math.log10(255/rmse):Infinity;
 assert.ok(psnr>=32,'Candidate color PSNR below existing web asset gate: '+psnr);
 const [baselineValidation,candidateValidation]=await Promise.all([runtimeBytes,candidateBytes].map(async bytes=>validator.validateBytes(new Uint8Array(await decodeWebGlb(arrayBuffer(bytes))),{maxIssues:10000})));
 const fingerprint=message=>JSON.stringify([message.code,message.pointer,message.message]);
 const baselineErrors=baselineValidation.issues.messages.filter(message=>message.severity===0),candidateErrors=candidateValidation.issues.messages.filter(message=>message.severity===0);
 const oldErrors=new Set(baselineErrors.map(fingerprint)),newErrors=candidateErrors.filter(message=>!oldErrors.has(fingerprint(message)));
 assert.equal(newErrors.length,0,'New decoded GLB conformance errors: '+JSON.stringify(newErrors));
 return {originalSha256:hash(originalBytes),runtimeSha256:hash(runtimeBytes),candidateSha256:hash(candidateBytes),imageIndex:index,decodedGeometryViews:geometryViews,decodedGeometryBytes:geometryBytes,decodedGeometryMaxError:0,otherImagesByteExact:otherImages,alphaDifferences,rmse,psnr:Number.isFinite(psnr)?psnr:null,colorPixelsExact:rmse===0,maxRgbDifference:max,decodedBaselineErrors:baselineErrors.length,decodedCandidateErrors:candidateErrors.length,baselineErrors,candidateErrors,newErrors,scope:'Offline decoded geometry, metadata, alpha, color error and conformance. Native appearance/loading, build/package and performance acceptance remain separate.'};
}
