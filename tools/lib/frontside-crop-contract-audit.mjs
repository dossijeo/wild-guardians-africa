// QA metadata for original/derived native crop batches; not a quality waiver.
export function createCropContractAudit() {
  const textures=new WeakMap();let nextId=1;
  const hash=async array=>{
    if(!array)return null;
    const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);
    return {bytes:bytes.length,sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('')};
  };
  async function texture(t){
    if(!t)return null;
    if(!textures.has(t))textures.set(t,{id:nextId++,result:null});
    const record=textures.get(t);
    if(!record.result)record.result=(async()=>({id:record.id,name:t.name,type:t.type,format:t.format,colorSpace:t.colorSpace,channel:t.channel,version:t.version,flipY:t.flipY,minFilter:t.minFilter,magFilter:t.magFilter,wrapS:t.wrapS,wrapT:t.wrapT,anisotropy:t.anisotropy,matrix:t.matrix.toArray(),matrixAutoUpdate:t.matrixAutoUpdate,offset:t.offset.toArray(),repeat:t.repeat.toArray(),center:t.center.toArray(),rotation:t.rotation,imageSize:[t.image?.width??null,t.image?.height??null],cpuImageData:ArrayBuffer.isView(t.image?.data)?await hash(t.image.data):null,cpuMipmaps:await Promise.all((t.mipmaps??[]).map(async m=>({width:m.width,height:m.height,data:ArrayBuffer.isView(m.data)?await hash(m.data):null})))}))();
    return record.result;
  }
  async function material(m){
    const maps={};for(const name of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','displacementMap','bumpMap','alphaMap'])maps[name]=await texture(m[name]);
    return {type:m.type,name:m.name,color:m.color?.toArray()??null,metalness:m.metalness,roughness:m.roughness,normalMapType:m.normalMapType,normalScale:m.normalScale?.toArray()??null,side:m.side,shadowSide:m.shadowSide,transparent:m.transparent,opacity:m.opacity,alphaTest:m.alphaTest,flatShading:m.flatShading,vertexColors:m.vertexColors,defines:m.defines??null,artBounds:m.userData.artBounds??null,artSurface:m.userData.artSurface??null,nativeSurface:m.userData.nativeSurface??null,cacheKey:m.customProgramCacheKey(),compileHook:m.onBeforeCompile.toString(),maps};
  }
  return {async snapshot(mesh,arm){
    const g=mesh.geometry,a=g.getAttribute('iGrowth');
    return {arm,mesh:mesh.name,count:mesh.count,visible:mesh.visible,frustumCulled:mesh.frustumCulled,matrix:mesh.matrix.toArray(),matrixWorld:mesh.matrixWorld.toArray(),modelViewMatrix:mesh.modelViewMatrix.toArray(),normalMatrix:mesh.normalMatrix.toArray(),geometry:{boundingBox:g.boundingBox?{min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray()}:null,boundingSphere:g.boundingSphere?{center:g.boundingSphere.center.toArray(),radius:g.boundingSphere.radius}:null,tangentPresent:!!g.getAttribute('tangent'),morphAttributes:Object.keys(g.morphAttributes),attributes:Object.fromEntries(Object.entries(g.attributes).map(([name,a])=>[name,{itemSize:a.itemSize,count:a.count,normalized:a.normalized,instanced:!!a.isInstancedBufferAttribute}])),indexType:g.index?.array.constructor.name,indexCount:g.index?.count,groups:g.groups},iGrowth:await hash(a?.array),instanceMatrix:await hash(mesh.instanceMatrix.array),materials:await Promise.all((Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(material))};
  }};
}
