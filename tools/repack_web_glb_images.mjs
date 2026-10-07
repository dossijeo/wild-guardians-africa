import sharp from 'sharp';
import {readGlb,writeGlb} from './glb-container.mjs';
import {gltfImageRoles} from './audit_image_assets.mjs';

const allowedExtensions=new Set(['EXT_meshopt_compression','EXT_texture_webp','KHR_materials_specular']);
const fail=message=>{throw Error('Web GLB image replacement: '+message);};
const integer=value=>Number.isSafeInteger(value)&&value>=0;

// Offline packaging only. Accept already converted WebP bytes; never transcode,
// decode/re-encode Meshopt, reorder vertices or rewrite animation/skin accessors.
// This deliberately supports the audited two-buffer runtime format, not arbitrary
// GLTF extensions with undiscovered references to physical buffer offsets.
export async function replaceWebGlbColorImages(input,replacements){
 if(!(input instanceof Uint8Array)||!(replacements instanceof Map))fail('expected GLB bytes and an image-index Map');
 const {json,bin}=readGlb(input),views=json.bufferViews,images=json.images;
 if(json.buffers?.length!==2||json.buffers.some(b=>b.uri)||json.buffers[1].extensions?.EXT_meshopt_compression?.fallback!==true)fail('unsupported buffer layout');
 if(!integer(json.buffers[0].byteLength)||json.buffers[0].byteLength>bin.length||bin.length>Math.ceil(json.buffers[0].byteLength/4)*4)fail('invalid physical buffer length');
 if(!Array.isArray(views)||!Array.isArray(images)||(json.extensionsUsed??[]).some(name=>!allowedExtensions.has(name))||(json.extensionsRequired??[]).some(name=>!allowedExtensions.has(name)))fail('unsupported views, images or extensions');
 const imageViews=new Set();
 const bytesAt=range=>{
  const offset=range.byteOffset??0;
  if(range.buffer!==0||!integer(offset)||!integer(range.byteLength)||range.byteLength===0||offset%4||offset+range.byteLength>json.buffers[0].byteLength)fail('invalid physical byte range');
  return bin.subarray(offset,offset+range.byteLength);
 };
 for(const image of images){
  if(image.uri||image.mimeType!=='image/webp'||!integer(image.bufferView)||!views[image.bufferView]||imageViews.has(image.bufferView))fail('unsupported image view or shared image storage');
  const view=views[image.bufferView];if(view.extensions)fail('extended image view');bytesAt(view);imageViews.add(image.bufferView);
 }
 for(const [index,view] of views.entries())if(!imageViews.has(index)){
  const ext=view.extensions?.EXT_meshopt_compression;
  if(view.buffer!==1||!ext||Object.keys(view.extensions).some(name=>name!=='EXT_meshopt_compression'))fail('non-image view is not audited Meshopt storage');
  bytesAt(ext);
 }
 for(const [index,bytes] of replacements){
  if(!integer(index)||!images[index]||!(bytes instanceof Uint8Array)||!bytes.length)fail('invalid replacement image');
  const roles=gltfImageRoles(json,index);
  if(roles.requiresExactPixels||roles.roles.length!==1||roles.roles[0]!=='color')fail('replacement is not exclusively a color image');
  const before=bytesAt(views[images[index].bufferView]);
  const [oldMeta,newMeta]=await Promise.all([sharp(before).metadata(),sharp(bytes).metadata()]);
  if(newMeta.format!=='webp'||newMeta.width!==oldMeta.width||newMeta.height!==oldMeta.height||(newMeta.pages??1)!==1||newMeta.orientation&&newMeta.orientation!==1||newMeta.icc)fail('replacement must preserve dimensions and use single-frame unprofiled WebP');
  // Preserve the cutout silhouette even if an encoder removes an opaque alpha
  // channel. Compare its values, not merely the metadata hasAlpha flag.
  if(oldMeta.hasAlpha||newMeta.hasAlpha){
   const [a,b]=await Promise.all([sharp(before).ensureAlpha().extractChannel(3).raw().toBuffer(),sharp(bytes).ensureAlpha().extractChannel(3).raw().toBuffer()]);
   if(!a.equals(b))fail('replacement changes alpha coverage');
  }
 }
 if(!replacements.size)return Uint8Array.from(input);
 const chunks=[];let length=0;
 const append=bytes=>{const offset=length;chunks.push({offset,bytes});length+=Math.ceil(bytes.length/4)*4;return offset;};
 // Capture every source range before updating any offsets.
 const originalImages=images.map(image=>bytesAt(views[image.bufferView]));
 const originalGeometry=views.map((view,index)=>imageViews.has(index)?null:bytesAt(view.extensions.EXT_meshopt_compression));
 for(const [index,image] of images.entries()){
  const bytes=replacements.get(index)??originalImages[index],view=views[image.bufferView];
  view.byteOffset=append(bytes);view.byteLength=bytes.length;
 }
 for(const [index,view] of views.entries())if(!imageViews.has(index))view.extensions.EXT_meshopt_compression.byteOffset=append(originalGeometry[index]);
 json.buffers[0].byteLength=length;
 const packed=new Uint8Array(length);for(const chunk of chunks)packed.set(chunk.bytes,chunk.offset);
 return writeGlb(json,packed);
}
