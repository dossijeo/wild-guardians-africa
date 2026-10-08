// QA only, outside the timed block. CPU attributes/versions describe the draw
// submission; they do not prove GPU buffer bytes or pixel equivalence.
import {captureRenderSubmissions} from './render-submission-breakdown.js';
export function activeAttributeHash(attribute,count=attribute?.count??0){
 if(!attribute?.array)return null;
 const array=attribute.array,length=Math.min(array.length,count*attribute.itemSize),bytes=new Uint8Array(array.buffer,array.byteOffset,length*array.BYTES_PER_ELEMENT);let hash=2166136261;
 for(const byte of bytes)hash=Math.imul(hash^byte,16777619)>>>0;
 return {elements:length,bytes:bytes.byteLength,hash:hash.toString(16).padStart(8,'0')};
}
export function captureFarSubmissionState(world,render){
 const renderer=world.renderer,original=renderer.renderBufferDirect,draws=[];
 renderer.renderBufferDirect=function(camera,scene,geometry,material,object,group){
  const calls=renderer.info.render.calls,value=original.call(this,camera,scene,geometry,material,object,group);
  if(renderer.info.render.calls>calls){
   const target=renderer.getRenderTarget(),count=object.isInstancedMesh?object.count:geometry.instanceCount??null;
   draws.push({pass:target===world.sun.shadow.map?'shadow':target===null?'screen':target===world.destructionPass.smokeDepth?'world-depth':'other-target',
    object:object.uuid,name:object.name,geometry:geometry.uuid,material:material.uuid,materialVersion:material.version,materialType:material.type,
    program:renderer.properties.get(material).currentProgram?.id??null,recipe:material.customProgramCacheKey(),
    count,drawRange:{...geometry.drawRange},group:group?{...group}:null,
    matrix:object.matrixWorld.elements.slice(),instanceMatrices:activeAttributeHash(object.instanceMatrix,count??undefined),
    attributes:Object.fromEntries(Object.entries(geometry.attributes).map(([key,a])=>[key,{count:a.count,itemSize:a.itemSize,version:a.version??a.data?.version??null,
     ...(a.isInstancedBufferAttribute?{active:activeAttributeHash(a,count??a.count)}:{})}])),
    index:geometry.index?{count:geometry.index.count,version:geometry.index.version}:null,
    receiveShadow:object.receiveShadow,castShadow:object.castShadow});
  }
  return value;
 };
 try{return {breakdown:captureRenderSubmissions(world,render),draws,limit:'Actual submitted objects/programs and CPU attribute hashes. No GPU buffer-byte or framebuffer equality proof. Captured before timing, then hook removed.'};}
 finally{renderer.renderBufferDirect=original;}
}
