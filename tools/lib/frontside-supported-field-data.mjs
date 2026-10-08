// Experimental data/geometry ownership only. No field shader or approval.
import * as THREE from 'three';
const hash=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');
const TYPES={Float32:Float32Array,Uint32:Uint32Array,Uint16:Uint16Array};

export async function loadSupportedFieldData(url){
 const metadataResponse=await fetch(url);if(!metadataResponse.ok)throw Error(await metadataResponse.text());
 const metadata=await metadataResponse.json();
 if(metadata.status!=='EXPERIMENTAL_FIELD_TABLES_SHADER_AND_GATES_PENDING')throw Error('Unexpected experimental field schema');
 const base=new URL(url,location.href),response=await fetch(new URL(metadata.payload,base));if(!response.ok)throw Error(await response.text());
 const buffer=await response.arrayBuffer();if(buffer.byteLength!==metadata.payloadBytes||await hash(buffer)!==metadata.payloadSha256)throw Error('Field payload hash/size mismatch');
 const views={};
 for(const [name,entry] of Object.entries(metadata.arrays)){
  const Type=TYPES[entry.dtype];if(!Type)throw Error('Unknown field array type');
  if(entry.byteOffset%Type.BYTES_PER_ELEMENT||entry.byteOffset+entry.byteLength>buffer.byteLength)throw Error('Invalid field span');
  views[name]=new Type(buffer,entry.byteOffset,entry.byteLength/Type.BYTES_PER_ELEMENT);
  if(await hash(new Uint8Array(buffer,entry.byteOffset,entry.byteLength))!==entry.sha256)throw Error('Field array hash mismatch: '+name);
 }
 return{metadata,buffer,views};
}

export async function createSupportedFieldTextures(sourceGeometry,data,renderer){
 const {metadata,views}=data,textures={},owned=[];
 const make=(name,array,width,height,format,type,internalFormat)=>{
  if(width>renderer.capabilities.maxTextureSize||height>renderer.capabilities.maxTextureSize)throw Error('Field texture exceeds renderer capability: '+name);
  const texture=new THREE.DataTexture(array,width,height,format,type);
  texture.internalFormat=internalFormat;texture.minFilter=texture.magFilter=THREE.NearestFilter;
  texture.generateMipmaps=false;texture.flipY=false;texture.unpackAlignment=1;texture.colorSpace=THREE.NoColorSpace;
  texture.name='QA source field '+name;texture.needsUpdate=true;owned.push(texture);textures[name]=texture;return texture;
 };
 try{
  for(const [semantic,name,size,format,internal] of [['POSITION','position',3,THREE.RGBFormat,'RGB32F'],['NORMAL','normal',3,THREE.RGBFormat,'RGB32F'],['TEXCOORD_0','uv',2,THREE.RGFormat,'RG32F']]){
   const attribute=sourceGeometry.getAttribute(name),proof=metadata.sourceAccessors.find(a=>a.name===semantic);
   if(!attribute||attribute.isInterleavedBufferAttribute||!(attribute.array instanceof Float32Array)||attribute.itemSize!==size||attribute.count!==proof.count||attribute.normalized)throw Error('Borrowed source field layout unsupported: '+name);
   const bytes=new Uint8Array(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength);
   if(await hash(bytes)!==proof.runtimeDecodedSha256)throw Error('Borrowed runtime field bits differ: '+name);
   // Borrow the existing typed array without mutation or an extra CPU copy.
   // It remains an additional GPU texture; source VBO coexistence must count.
   make(name,attribute.array,attribute.count,1,format,THREE.FloatType,internal);
  }
  const formats={RGBA32F:[THREE.RGBAFormat,THREE.FloatType],RGBA16UI:[THREE.RGBAIntegerFormat,THREE.UnsignedShortType],RG32UI:[THREE.RGIntegerFormat,THREE.UnsignedIntType],R16UI:[THREE.RedIntegerFormat,THREE.UnsignedShortType]};
  for(const [name,entry] of Object.entries(metadata.arrays))if(entry.texture){
   const layout=entry.texture,[format,type]=formats[layout.format];make(name,views[name],layout.width,layout.height,format,type,layout.format);
  }
 }catch(error){for(const texture of owned)texture.dispose();throw error;}
 return{textures,dispose(){for(const texture of owned)texture.dispose();},limitations:['Typed arrays borrowed; no CPU mutation or copying. GPU textures have not been drawn/read back.','Source VBO and texture uploads coexist; ownership does not imply memory savings.']};
}

export function createSupportedFieldGeometry(kind,sourceGeometry,data){
 const {metadata,views}=data,sourceIndex=sourceGeometry.index;
 if(!sourceIndex)throw Error('Expected original indexed native crop');
 const geometry=new THREE.BufferGeometry();
 if(kind==='fallback'){
  for(const [name,attribute] of Object.entries(sourceGeometry.attributes))geometry.setAttribute(name,attribute);
  const faces=views.fallbackOriginalFaces,index=new Uint16Array(faces.length*3);
  for(let i=0;i<faces.length;i++)for(let lane=0;lane<3;lane++)index[i*3+lane]=sourceIndex.getX(faces[i]*3+lane);
  geometry.setIndex(new THREE.BufferAttribute(index,1));
 }else if(kind==='proxy'){
  const count=metadata.arrays.proxyPosition.scalarCount/3;
  geometry.setAttribute('position',new THREE.BufferAttribute(views.proxyPosition,3));
  geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(count*2),2));
  geometry.setAttribute('aFieldDomain',new THREE.BufferAttribute(views.proxyDomain,2));
  geometry.setAttribute('aFieldChart',new THREE.BufferAttribute(views.proxyVertexChart,1));
  geometry.setAttribute('aFieldFace',new THREE.BufferAttribute(new Float32Array(count).fill(-1),1));
  geometry.setAttribute('aFieldBary',new THREE.BufferAttribute(new Float32Array(count*3),3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(views.proxyIndices),1));geometry.computeVertexNormals();
 }else if(kind==='sourceFine'){
  const faces=views.supportedOriginalFaces,count=faces.length*3,p=new Float32Array(count*3),n=new Float32Array(count*3),uv=new Float32Array(count*2),domain=new Float32Array(count*2),chart=new Float32Array(count),faceIds=new Float32Array(count),bary=new Float32Array(count*3);
  const P=sourceGeometry.getAttribute('position'),N=sourceGeometry.getAttribute('normal'),U=sourceGeometry.getAttribute('uv');
  for(let i=0;i<faces.length;i++)for(let lane=0;lane<3;lane++){
   const v=i*3+lane,source=sourceIndex.getX(faces[i]*3+lane);
   p.set([P.getX(source),P.getY(source),P.getZ(source)],v*3);n.set([N.getX(source),N.getY(source),N.getZ(source)],v*3);uv.set([U.getX(source),U.getY(source)],v*2);
   domain.set(views.supportedSourceDomain.subarray(v*2,v*2+2),v*2);chart[v]=views.supportedSourceChart[i];faceIds[v]=i;bary[v*3+lane]=1;
  }
  for(const [name,array,size] of [['position',p,3],['normal',n,3],['uv',uv,2],['aFieldDomain',domain,2],['aFieldChart',chart,1],['aFieldFace',faceIds,1],['aFieldBary',bary,3]])geometry.setAttribute(name,new THREE.BufferAttribute(array,size));
 }else throw Error('Unknown field geometry kind');
 if(kind!=='fallback')geometry.setAttribute('iGrowth',sourceGeometry.getAttribute('iGrowth'));
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData.experimentalSourceFieldKind=kind;
 return geometry;
}
