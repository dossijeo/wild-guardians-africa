// Disabled derived-asset writer. No view visibility or original file mutation.
import * as THREE from 'three';
export function sharedLeafReverseGeometry(source,payload,{reverseLeaves=true}={}){
 if(payload.status!=='BLENDER_REMODELLING_TRAINING_NOT_APPROVED'||payload.corners.length!==payload.faceLabels.length||Object.keys(source.morphAttributes).length||source.getAttribute('tangent'))throw Error('Unsupported shared-leaf source contract');
 const table=new Map(),rows=[],core=[],leaf=[],reverse=[],forwardFaceOrder=[];
 const corner=values=>{if(values.length!==8||!values.every(Number.isFinite))throw Error('Invalid derived corner');const f=Float32Array.from(values),key=Array.from(new Uint32Array(f.buffer)).join(',');if(!table.has(key)){table.set(key,rows.length);rows.push(f);}return table.get(key);};
 const coreFaces=[],leafFaces=[];
 payload.corners.forEach((triangle,face)=>{
  if(triangle.length!==3||!Number.isInteger(payload.faceLabels[face])||payload.faceLabels[face]<0)throw Error('Invalid derived face');
  const ids=triangle.map(corner);
  if(payload.faceLabels[face]<2){core.push(...ids);coreFaces.push(face);}else{leaf.push(...ids);leafFaces.push(face);if(reverseLeaves)reverse.push(ids[0],ids[2],ids[1]);}
 });
 forwardFaceOrder.push(...coreFaces,...leafFaces);
 const geometry=new source.constructor(),p=[],n=[],uv=[];
 for(const row of rows){p.push(...row.slice(0,3));n.push(...row.slice(3,6));uv.push(...row.slice(6,8));}
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 for(const [name,a] of Object.entries(source.attributes))if(!['position','normal','uv'].includes(name)){if(!a.isInstancedBufferAttribute)throw Error('Unknown source lane '+name);geometry.setAttribute(name,a);}
 const Type=rows.length<=65535?Uint16Array:Uint32Array;geometry.setIndex(new THREE.BufferAttribute(new Type([...core,...leaf,...reverse]),1));
 if(reverseLeaves){geometry.addGroup(0,core.length,0);geometry.addGroup(core.length,leaf.length,1);geometry.addGroup(core.length+leaf.length,reverse.length,2);}
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const order=[...forwardFaceOrder,...(reverseLeaves?leafFaces:[])];
 geometry.userData={...source.userData,qaDerivedArchiveSource:payload.sourceSha256,qaDerivedFaceLabels:order.map(f=>payload.faceLabels[f]),qaDerivedArchiveFaceOrder:order,qaOriginalFaceIds:order.map(f=>f<payload.originalCoreFaceIds.length?payload.originalCoreFaceIds[f]:null),qaReverseFaceStart:reverseLeaves?forwardFaceOrder.length:null};
 return {geometry,uniqueVertices:rows.length,forwardFaceOrder,coreTriangles:core.length/3,leafTriangles:leaf.length/3,reverseTriangles:reverse.length/3,attributeBytes:p.length*4+n.length*4+uv.length*4,indexBytes:geometry.index.array.byteLength};
}

export function preserveSharedLeafBackRecipe(material){
 material.side=THREE.FrontSide;material.defines={...material.defines,DOUBLE_SIDED:''};
 const compile=material.onBeforeCompile,key=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  compile?.call(this,shader,renderer);
  if(!shader.fragmentShader.includes('gl_FrontFacing'))throw Error('Missing native face direction recipe');
  // A reversed geometric face is culled as FrontSide but corresponds to the
  // original back face. This includes AfricanToon's own face-direction uses,
  // not just Three's normal_fragment_begin. Uniform per draw; no vertex flag.
  shader.fragmentShader=shader.fragmentShader.replace(/\bgl_FrontFacing\b/g,'false');
 };
 material.customProgramCacheKey=function(){return (key?.call(this)??'')+'|qa-shared-leaf-source-back-v1';};material.needsUpdate=true;
}
