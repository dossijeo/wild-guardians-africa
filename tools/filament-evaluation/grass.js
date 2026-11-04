// Frozen resident Sabana geometry from the earlier, measured visual experiment.
// The default expands instances in BOTH engines: official Filament web bindings
// expose no divisor for custom attributes. Native Three instancing is a separate
// solution measurement, never mixed with this backend parity comparison.
const fields = [['position',3],['normal',3],['flatPosition',3],['bladeRoot',3],['coverageAnchor',4],['coverageData',4],['coverageSlope',2],['uv',2]];
const stride = fields.reduce((n,[,size])=>n+size,0);
export async function loadGrassTexture({url,THREE,engine,Filament:F=globalThis.Filament}) {
  const response=await fetch(new URL(url,location.origin+'/'));if(!response.ok)throw Error(`Grass texture ${response.status}`);
  const image=await createImageBitmap(await response.blob()),canvas=document.createElement('canvas'),mipmaps=[];
  for(let width=image.width,height=image.height;;width=Math.max(1,width>>1),height=Math.max(1,height>>1)) {
    canvas.width=width;canvas.height=height;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0,width,height);
    mipmaps.push({data:new Uint8Array(context.getImageData(0,0,width,height).data.buffer),width,height});if(width===1&&height===1)break;
  }
  image.close();const first=mipmaps[0];let threeTexture,filamentTexture;
  if(THREE){threeTexture=new THREE.DataTexture(first.data,first.width,first.height,THREE.RGBAFormat,THREE.UnsignedByteType);threeTexture.mipmaps=mipmaps;threeTexture.generateMipmaps=false;threeTexture.flipY=false;threeTexture.colorSpace=THREE.NoColorSpace;threeTexture.wrapS=threeTexture.wrapT=THREE.RepeatWrapping;threeTexture.minFilter=THREE.LinearMipmapLinearFilter;threeTexture.magFilter=THREE.LinearFilter;threeTexture.anisotropy=8;threeTexture.needsUpdate=true;}
  if(engine){filamentTexture=F.Texture.Builder().width(first.width).height(first.height).levels(mipmaps.length).sampler(F.Texture$Sampler.SAMPLER_2D).format(F.Texture$InternalFormat.RGBA8).build(engine);for(let level=0;level<mipmaps.length;level++)filamentTexture.setImage(engine,level,F.PixelBuffer(mipmaps[level].data,F.PixelDataFormat.RGBA,F.PixelDataType.UBYTE));}
  return {threeTexture,filamentTexture,mipmaps,width:first.width,height:first.height,bytes:mipmaps.reduce((n,m)=>n+m.data.byteLength,0),dispose(){threeTexture?.dispose();if(filamentTexture)engine.destroyTexture(filamentTexture);}};
}
export async function loadGrassSnapshot(url='/tools/filament-evaluation/fixtures/grass-snapshot.json') {
  const response=await fetch(url); if(!response.ok) throw Error(`${url}: ${response.status}`);
  const snapshot=await response.json(); if(snapshot.schemaVersion!==1) throw Error('Grass snapshot schema');
  for(const matrix of snapshot.renderSpace.modelMatrices) if(matrix.some((v,i)=>v!==(i%5===0?1:0))) throw Error('Grass parity fixture requires identity model transforms');
  return snapshot;
}
export function packGrass(snapshot,density=1,expand=true) {
  if(!(density>0&&density<=4)) throw Error('Grass density must be in (0,4]');
  return snapshot.geometries.map(entry=>{
    const vertexCount=entry.attributes.position.array.length/3, count=Math.floor(entry.count*density);
    const data=new Float32Array(expand?count*vertexCount*stride:0), indices=new Uint32Array(expand?count*entry.index.length:0);
    for(let instance=0;expand&&instance<count;instance++) {
      // Even deterministic subsampling below density 1; above 1 repeat original
      // distribution with tiny local offsets, keeping the captured selection.
      const source=(density<1?Math.floor(instance/density):instance)%entry.count, repeat=Math.floor(instance/entry.count);
      for(let vertex=0;vertex<vertexCount;vertex++) {
        let offset=(instance*vertexCount+vertex)*stride;
        for(const [name,size] of fields) {
          const attribute=entry.attributes[name], start=(attribute.instanced?source:vertex)*size;
          for(let k=0;k<size;k++) data[offset++]=attribute.array[start+k]+(name==='coverageAnchor'&&k===0?repeat*.07:0);
        }
      }
      for(let i=0;i<entry.index.length;i++) indices[instance*entry.index.length+i]=entry.index[i]+instance*vertexCount;
    }
    return {entry,data,indices,count,vertexCount,stride};
  });
}
function metadata(snapshot,packed,nativeInstancing=false) {
  return {sourceCommit:snapshot.sourceCommit,biome:snapshot.biome,instances:packed.reduce((n,p)=>n+p.count,0),
    triangles:packed.reduce((n,p)=>n+p.count*p.entry.index.length/3,0),drawCalls:packed.filter(p=>p.count).length,
    attributeBytes:packed.reduce((n,p)=>n+p.data.byteLength,0),indexBytes:packed.reduce((n,p)=>n+p.indices.byteLength,0),
    representation:nativeInstancing?'native-three-instancing':'expanded-parity',
    limitations:['Captured resident selection: no runtime CPU culling or streaming measured.',
      'Shader distance LOD / far fade active; fixed submitted topology, no automatic CPU removal.',
      'Grass shadow visibility is 1 in both engines, matching the source experiment.',
      'Density > 1 repeats captured distribution with 0.07 unit x offsets.',
      'Partial update touches contiguous 1% instance ranges in persistent buffers; does not measure game selection.']};
}
function initial(snapshot,entry) {
  const u=snapshot.uniforms;
  const light=u.uLightDir, length=Math.hypot(...light);
  return {uCoverageTime:u.uCoverageTime,uCoverageWindStrength:u.uCoverageWindStrength,uCoverageRefined:Number(entry.refined),
    uCoverageSpacing:u.uCoverageSpacing,uCoverageFar:u.uCoverageFar,uCoverageSeed:u.uCoverageSeed,uCoverageScale:u.uCoverageScale,
    uNight:u.uNight,uNightLight:u.uNightLight,uExposure:u.uExposure,uLightDir:light.map(v=>v/length),
    uEye:snapshot.renderSpace.cameraPosition,uPigmentTint:snapshot.biome==='gran-rio'?[.93,1.08,.84]:[1.14,1.09,.97]};
}
// Mirrors grass.mat, source qa-continuous-grass.js and prior grass-materials.js.
const vertex=`
in vec3 position,normal,flatPosition,bladeRoot;in vec4 coverageAnchor,coverageData;in vec2 coverageSlope,uv;
uniform mat4 modelViewMatrix,projectionMatrix;
uniform float uCoverageTime,uCoverageWindStrength,uCoverageRefined,uCoverageSpacing,uCoverageFar,uCoverageScale,uNight,uNightLight,uExposure;
uniform vec2 uCoverageSeed;uniform vec3 uEye,uLightDir,uPigmentTint;uniform sampler2D uCoverageColor;
out vec3 vColor,vSun;
void main(){
float ca=cos(coverageData.x),sa=sin(coverageData.x);mat2 turn=mat2(ca,-sa,sa,ca);
vec3 root=coverageAnchor.xyz;float distanceToEye=length(uEye.xz-root.xz);
float fade=1.-smoothstep(uCoverageFar-12.,uCoverageFar,distanceToEye),lod=1.-smoothstep(18.,24.,distanceToEye);
float growth=fade*(uv.y>=8./12.?lod:1.);
vec3 pos=mix(flatPosition,position,lod*uCoverageRefined);pos=bladeRoot+(pos-bladeRoot)*growth;
pos.xz=turn*pos.xz*uCoverageSpacing;pos.y*=coverageAnchor.w;pos.y+=dot(coverageSlope,pos.xz);
vec2 direction=normalize(vec2(1.,.38));
float wave=.65*sin(uCoverageTime*1.15+dot(root.xz,vec2(.21,.13)))+.35*sin(uCoverageTime*2.4+dot(root.xz,vec2(.57,-.31))+uv.y*4.);
float bend=uCoverageRefined*.50*uCoverageWindStrength*wave*pow(max(position.y*coverageAnchor.w,0.),2.)*growth;
pos.xz+=direction*bend;
vec3 N=normal;N.xz=turn*N.xz;N.y-=uCoverageRefined*uCoverageWindStrength*wave*position.y*dot(N.xz,direction);N=normalize(N+vec3(0.,.45,0.));
vec2 tileUV=mat2(.8,-.6,.6,.8)*(root.xz+pos.xz)*uCoverageScale+uCoverageSeed;
vec3 pigment=textureLod(uCoverageColor,tileUV,2.).rgb*uPigmentTint*(.88+.20*coverageData.y);
vec3 base=pow(clamp(pigment,0.,1.),vec3(2.2))*(.63+.37*uv.x)*uExposure;
vColor=base*mix(vec3(.17,.28,.34),vec3(.095,.17,.32)*uNightLight,uNight);
vSun=base*mix(vec3(1.55,1.42,1.02),vec3(.22,.36,.66)*uNightLight,uNight)*(.35+.65*max(dot(N,uLightDir),0.));
gl_Position=projectionMatrix*modelViewMatrix*vec4(root+pos,1.);
}`;
const fragment=`precision highp float;in vec3 vColor,vSun;out vec4 color;
void main(){vec3 lit=vColor+vSun;vec3 x=clamp((lit*(2.51*lit+.03))/(lit*(2.43*lit+.59)+.14),0.,1.);
color=vec4(mix(x*12.92,1.055*pow(x,vec3(1./2.4))-.055,step(vec3(.0031308),x)),1.);}`;

export function createThreeGrass({THREE,snapshot,density=1,texture,nativeInstancing=false}) {
  const packed=packGrass(snapshot,density,!nativeInstancing),resources=[],entities=[];
  for(const p of packed) {
    const geometry=nativeInstancing?new THREE.InstancedBufferGeometry():new THREE.BufferGeometry();
    let buffer;
    if(nativeInstancing) {
      for(const [name,size]of fields) {
        const source=p.entry.attributes[name];
        if(!source.instanced) geometry.setAttribute(name,new THREE.BufferAttribute(new Float32Array(source.array),size));
        else {
          const array=new Float32Array(p.count*size);
          for(let i=0;i<p.count;i++) for(let k=0;k<size;k++) array[i*size+k]=source.array[((density<1?Math.floor(i/density):i)%p.entry.count)*size+k]+(name==='coverageAnchor'&&k===0?Math.floor(i/p.entry.count)*.07:0);
          geometry.setAttribute(name,new THREE.InstancedBufferAttribute(array,size).setUsage(THREE.DynamicDrawUsage));
        }
      }
      geometry.setIndex(p.entry.index);geometry.instanceCount=p.count;
    } else {
      buffer=new THREE.InterleavedBuffer(p.data,stride).setUsage(THREE.DynamicDrawUsage);
      let offset=0;for(const[name,size]of fields){geometry.setAttribute(name,new THREE.InterleavedBufferAttribute(buffer,size,offset));offset+=size;}
      geometry.setIndex(new THREE.BufferAttribute(p.indices,1));
    }
    const uniforms=Object.fromEntries(Object.entries(initial(snapshot,p.entry)).map(([name,value])=>[name,{value:Array.isArray(value)?(value.length===2?new THREE.Vector2(...value):new THREE.Vector3(...value)):value}]));
    uniforms.uCoverageColor={value:texture};
    const material=new THREE.RawShaderMaterial({vertexShader:vertex,fragmentShader:fragment,glslVersion:THREE.GLSL3,uniforms,side:THREE.DoubleSide,toneMapped:false});
    const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.visible=p.count>0;
    entities.push(mesh);resources.push({p,geometry,material,uniforms,buffer});
  }
  const info=metadata(snapshot,packed,nativeInstancing);
  if(nativeInstancing){info.attributeBytes=resources.reduce((n,r)=>n+Object.values(r.geometry.attributes).reduce((s,a)=>s+a.array.byteLength,0),0);info.indexBytes=resources.reduce((n,r)=>n+r.geometry.index.array.byteLength,0);}
  return {entities,meshes:entities,metadata:info,
    update(time,night=snapshot.uniforms.uNight,eye=snapshot.renderSpace.cameraPosition){for(const r of resources){r.uniforms.uCoverageTime.value=time;r.uniforms.uNight.value=night;r.uniforms.uEye.value.fromArray(eye);}},
    updatePartial(fraction=.01,step=0){let bytes=0;for(const r of resources){const {p}=r, count=Math.min(p.count,Math.max(1,Math.floor(p.count*fraction))),first=p.count?Math.floor(step*count)%p.count:0,end=Math.min(p.count,first+count);if(nativeInstancing){const a=r.geometry.getAttribute('coverageAnchor');for(let i=first;i<end;i++)a.array[i*4+1]+=(step%2===0?.0001:-.0001);a.clearUpdateRanges();a.addUpdateRange(first*4,(end-first)*4);a.needsUpdate=true;bytes+=(end-first)*16;}else{mutateRange(p,first,end,step);r.buffer.clearUpdateRanges();r.buffer.addUpdateRange(first*p.vertexCount*stride,(end-first)*p.vertexCount*stride);r.buffer.needsUpdate=true;bytes+=(end-first)*p.vertexCount*stride*4;}}return bytes;},
    dispose(){for(const r of resources){r.geometry.dispose();r.material.dispose();}}};
}
function mutateRange(p,first,end,step){for(let i=first*p.vertexCount;i<end*p.vertexCount;i++)p.data[i*stride+13]+=(step%2===0?.0001:-.0001);}

export function createFilamentGrass({engine,Filament:F,snapshot,density=1,texture,materialBytes,nativeInstancing=false}) {
  const packed=packGrass(snapshot,density,!nativeInstancing),resources=[],entities=[],material=engine.createMaterial(materialBytes);
  const sampler=new F.TextureSampler(F.MinFilter.LINEAR_MIPMAP_LINEAR,F.MagFilter.LINEAR,F.WrapMode.REPEAT);sampler.setAnisotropy(8);
  const attrs=['POSITION','CUSTOM0','CUSTOM1','CUSTOM2','CUSTOM3','CUSTOM4','CUSTOM5','CUSTOM6'];
  for(const p of packed) {
    const builder=F.VertexBuffer.Builder().vertexCount((nativeInstancing?1:p.count)*p.vertexCount).bufferCount(1);
    let offset=0;fields.forEach(([name,size],i)=>{if(!nativeInstancing||!p.entry.attributes[name].instanced)builder.attribute(F.VertexAttribute[attrs[i]],0,F.VertexBuffer$AttributeType[`FLOAT${size}`],offset*4,stride*4);offset+=size;});
    if(nativeInstancing){p.data=new Float32Array(p.vertexCount*stride);for(let v=0;v<p.vertexCount;v++){let o=v*stride;for(const[name,size]of fields){const a=p.entry.attributes[name];for(let k=0;k<size;k++)p.data[o++]=a.instanced?0:a.array[v*size+k];}}p.indices=new Uint32Array(p.entry.index);}
    const vb=builder.build(engine);vb.setBufferAt(engine,0,p.data);
    const ib=F.IndexBuffer.Builder().indexCount(p.indices.length).bufferType(F.IndexBuffer$IndexType.UINT).build(engine);ib.setBuffer(engine,p.indices);
    const instance=material.createInstance();
    for(const[name,value]of Object.entries(initial(snapshot,p.entry))){if(Array.isArray(value))instance[`setFloat${value.length}Parameter`](name,value);else instance.setFloatParameter(name,value);}
    instance.setTextureParameter('uCoverageColor',texture,sampler);
    const entity=F.EntityManager.get().create();
    let dataTexture,instanceData;
    if(nativeInstancing){instanceData=new Float32Array(256*Math.max(1,Math.ceil(p.count*3/256))*4);for(let i=0;i<p.count;i++){const source=(density<1?Math.floor(i/density):i)%p.entry.count;let o=i*12;for(const name of ['coverageAnchor','coverageData','coverageSlope']){const a=p.entry.attributes[name];for(let k=0;k<4;k++)instanceData[o++]=k<a.itemSize?a.array[source*a.itemSize+k]+(name==='coverageAnchor'&&k===0?Math.floor(i/p.entry.count)*.07:0):0;}}dataTexture=F.Texture.Builder().width(256).height(instanceData.length/1024).levels(1).sampler(F.Texture$Sampler.SAMPLER_2D).format(F.Texture$InternalFormat.RGBA32F).build(engine);dataTexture.setImage(engine,0,F.PixelBuffer(instanceData,F.PixelDataFormat.RGBA,F.PixelDataType.FLOAT));instance.setTextureParameter('uInstanceData',dataTexture,new F.TextureSampler(F.MinFilter.NEAREST,F.MagFilter.NEAREST,F.WrapMode.CLAMP_TO_EDGE));}
    const renderable=F.RenderableManager.Builder(1).boundingBox({center:[140,10,45],halfExtent:[100,30,100]}).culling(false).castShadows(false).receiveShadows(false)
      .geometry(0,F.RenderableManager$PrimitiveType.TRIANGLES,vb,ib).material(0,instance).build(engine,entity);
    if(nativeInstancing)engine.getRenderableManager().setInstanceCount(engine.getRenderableManager().getInstance(entity),p.count);
    entities.push(entity);resources.push({p,vb,ib,instance,entity,dataTexture,instanceData});
  }
  const info=metadata(snapshot,packed);if(nativeInstancing){info.representation='native-filament-texture-instancing';info.instanceDataBytes=resources.reduce((n,r)=>n+r.instanceData.byteLength,0);info.limitations.push('Official web Texture.setImage exposes full-level upload only; partial entity changes upload whole instance data texture.');}
  return {entities,metadata:info,
    update(time,night=snapshot.uniforms.uNight,eye=snapshot.renderSpace.cameraPosition){for(const r of resources){r.instance.setFloatParameter('uCoverageTime',time);r.instance.setFloatParameter('uNight',night);r.instance.setFloat3Parameter('uEye',eye);}},
    updatePartial(fraction=.01,step=0){let bytes=0;for(const r of resources){const p=r.p,count=Math.min(p.count,Math.max(1,Math.floor(p.count*fraction))),first=p.count?Math.floor(step*count)%p.count:0,end=Math.min(p.count,first+count);if(nativeInstancing){for(let i=first;i<end;i++)r.instanceData[i*12+1]+=(step%2===0?.0001:-.0001);r.dataTexture.setImage(engine,0,F.PixelBuffer(r.instanceData,F.PixelDataFormat.RGBA,F.PixelDataType.FLOAT));bytes+=r.instanceData.byteLength;}else{mutateRange(p,first,end,step);const begin=first*p.vertexCount*stride,finish=end*p.vertexCount*stride;r.vb.setBufferAt(engine,0,p.data.subarray(begin,finish),begin*4);bytes+=(finish-begin)*4;}}return bytes;},
    dispose(){for(const r of resources){engine.destroyEntity(r.entity);engine.destroyMaterialInstance(r.instance);engine.destroyVertexBuffer(r.vb);engine.destroyIndexBuffer(r.ib);if(r.dataTexture)engine.destroyTexture(r.dataTexture);}engine.destroyMaterial(material);}};
}
