import * as THREE from 'three';
// Visual shore mask: sampled once when the water mesh is built, never per frame.
export function naturalWaterEdgesEnabled(search=globalThis.location?.search??''){const q=new URLSearchParams(search);return q.get('visualLab')==='global-lighting'&&q.get('waterEdges')==='natural';}
export function balancedCanyonBankEnabled(biome,search=globalThis.location?.search??''){const q=new URLSearchParams(search);return biome==='gran-canon'&&q.get('visualLab')==='global-lighting'&&q.get('waterEdges')==='natural'&&q.get('canyonBank')==='balanced';}
export function* prepareNaturalWaterBed(world,geometry,cx,cz,{yielding=true,nativeGrid=false,directWetland=new URLSearchParams(globalThis.location?.search??'').get('waterBedDirect')==='1'}={}){
 if(world.state.biome==='desierto')return;
 geometry.computeBoundingBox();const box=geometry.boundingBox,field=world.nav.field;
 const minX=box.min.x+cx*48-.5,minZ=box.min.z+cz*48-.5;
 const width=box.max.x-box.min.x+1,height=box.max.z-box.min.z+1;
 const nx=Math.min(513,Math.ceil(width*2)+1),nz=Math.min(513,Math.ceil(height*2)+1);
 const edgeMap=new Map(),pos=geometry.attributes.position;
 const vertices=new Array(field.canyon?0:pos.count),vertexKeys=new Array(field.canyon?0:pos.count);
 const vertex=i=>{if(!vertices[i]){const v=[pos.getX(i)+cx*48,pos.getZ(i)+cz*48];vertices[i]=v;vertexKeys[i]=v.map(n=>n.toFixed(4)).join(',');}return vertices[i];};
 if(!field.canyon)for(let i=0;i+2<pos.count;i+=3)for(let j=0;j<3;j++){
 const a=vertex(i+j),b=vertex(i+(j+1)%3),ka=vertexKeys[i+j],kb=vertexKeys[i+(j+1)%3],key=ka<kb?ka+'|'+kb:kb+'|'+ka;
 const prev=edgeMap.get(key);if(prev)prev.count++;else edgeMap.set(key,{a,b,count:1});
 }
 const bins=new Map(),binSize=4;
 for(const {a,b,count} of edgeMap.values())if(count===1){
 // Chunk clips are not shorelines. Adjacent chunks continue across them.
 if((Math.abs(a[0]-b[0])<1e-4&&Math.abs(Math.abs(a[0]-cx*48)-24)<1e-4)||(Math.abs(a[1]-b[1])<1e-4&&Math.abs(Math.abs(a[1]-cz*48)-24)<1e-4))continue;
 for(let z=Math.floor((Math.min(a[1],b[1])-4)/binSize);z<=Math.floor((Math.max(a[1],b[1])+4)/binSize);z++)for(let x=Math.floor((Math.min(a[0],b[0])-4)/binSize);x<=Math.floor((Math.max(a[0],b[0])+4)/binSize);x++){const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push({a,b});}
 }
 const boundaryDistance=(x,z)=>{if(field.canyon)return 4;let squared=16;for(const {a,b} of bins.get(Math.floor(x/binSize)+','+Math.floor(z/binSize))??[]){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1))),rx=x-a[0]-t*dx,rz=z-a[1]-t*dz;squared=Math.min(squared,rx*rx+rz*rz);}return Math.sqrt(squared);};
 const grid=nativeGrid&&field.canyon?field.surfaceGrid?.(minX,minZ,width,height,nx,nz):null;
 // A borrowed WASM view must be consumed synchronously before another query.
 if(grid)yielding=false;
 const directMask=directWetland&&field.wetland&&typeof field.wetlandMask==='function';
 const wetlandLevel=directMask?field.wetlandLevel():null;
 const samples=grid??new Float32Array(nx*nz);let lo=Infinity,hi=-Infinity;
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){const px=minX+x/(nx-1)*width,pz=minZ+z/(nz-1)*height;const h=grid?grid[z*nx+x]:field.wetland?(directMask?wetlandLevel-Math.max(0,field.wetlandMask(px,pz)-.61)*3:field.wetlandLevel(px,pz)-Math.max(0,field.waterInfo(px,pz).mask-.61)*3):field.surface(px,pz);samples[z*nx+x]=h;lo=Math.min(lo,h);hi=Math.max(hi,h);if(yielding&&((z*nx+x)&127)===127)yield;}
 const span=Math.max(.001,hi-lo),bytes=new Uint8Array(nx*nz*4);
 for(let i=0;i<samples.length;i++){const h=Math.round((samples[i]-lo)/span*65535);bytes[i*4]=h>>>8;bytes[i*4+1]=h&255;bytes[i*4+2]=Math.round(boundaryDistance(minX+(i%nx)/(nx-1)*width,minZ+Math.floor(i/nx)/(nz-1)*height)/4*255);bytes[i*4+3]=255;if(yielding&&(i&1023)===1023)yield;}
 return {bytes,nx,nz,minX,minZ,width,height,lo,span};
}
export function prepareNaturalWater(world,geometry,cx,cz,source,preparedBed=null,options={}){
 let bed=preparedBed;
 if(!bed){const steps=prepareNaturalWaterBed(world,geometry,cx,cz,{...options,yielding:false});bed=steps.next().value;}
 if(!bed)return;
 const {bytes,nx,nz,minX,minZ,width,height,lo,span}=bed;
 const texture=new THREE.DataTexture(bytes,nx,nz,THREE.RGBAFormat);texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.unpackAlignment=1;texture.needsUpdate=true;
 const material=source,compile=source.onBeforeCompile,key=source.customProgramCacheKey();
 const balancedBank=balancedCanyonBankEnabled(world.state.biome);
 material.transparent=true;material.depthWrite=false;material.forceSinglePass=true;
 material.userData.paintUniforms=source.userData.paintUniforms;
 material.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);
 Object.assign(shader.uniforms,{qaBed:{value:texture},qaBedBounds:{value:new THREE.Vector4(minX,minZ,width,height)},qaBedRange:{value:new THREE.Vector2(lo,span)},qaBedSize:{value:new THREE.Vector2(nx,nz)}});
 shader.fragmentShader=`float qaShoreHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float qaShoreNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(qaShoreHash(i),qaShoreHash(i+vec2(1,0)),f.x),mix(qaShoreHash(i+vec2(0,1)),qaShoreHash(i+vec2(1,1)),f.x),f.y);}
`+'uniform sampler2D qaBed;uniform vec4 qaBedBounds;uniform vec2 qaBedRange;uniform vec2 qaBedSize;\n'+shader.fragmentShader;
 const anchor='#include <opaque_fragment>';if(!shader.fragmentShader.includes(anchor))throw Error('Depth bank anchor missing');
 shader.fragmentShader=shader.fragmentShader.replace(anchor,`vec2 qaUV=(worldPatternPosition(vPaintWorld).xz-qaBedBounds.xy)/qaBedBounds.zw;
 qaUV=(qaUV*(qaBedSize-1.)+.5)/qaBedSize;
 vec4 qaTexel=texture2D(qaBed,qaUV);vec2 qaEncoded=qaTexel.rg;
 float qaHeight=qaBedRange.x+dot(qaEncoded,vec2(65280.,255.))/65535.*qaBedRange.y;
 float qaDepth=max(0.,vPaintWorld.y-qaHeight);
 vec2 qaWorld=worldPatternPosition(vPaintWorld).xz;
 float qaLarge=qaShoreNoise(qaWorld*.48),qaFine=qaShoreNoise(qaWorld*2.7);
 float qaEdge=mix(.015,.19,qaLarge)+.035*qaFine;
 float qaWidth=mix(.075,.23,qaLarge);
 diffuseColor.a*=smoothstep(qaEdge,qaEdge+qaWidth,qaDepth);
 diffuseColor.a*=smoothstep(.04+qaLarge*.35,.48+qaLarge*.35,qaTexel.b*4.);
 `+anchor);
 if(balancedBank)shader.fragmentShader=shader.fragmentShader.replace('float qaEdge=mix(.015,.19,qaLarge)+.035*qaFine;','float qaEdge=mix(.015,.07,qaLarge)+.02*qaFine;').replace('float qaWidth=mix(.075,.23,qaLarge);','float qaWidth=mix(.24,.48,qaLarge);');
 // Coverage-derived optical depth, not bathymetry. Preserve the approved deep-water QA appearance.
 if(world.state.biome==='manglares'){
 const bodyAnchor='vec3 base=uInk0*.72;';
 if(!shader.fragmentShader.includes(bodyAnchor))throw Error('Mangrove deep-water anchor missing');
 shader.fragmentShader=shader.fragmentShader.replace(bodyAnchor,`vec2 bodyUV=(worldPatternPosition(worldP).xz-qaBedBounds.xy)/qaBedBounds.zw;
 bodyUV=(bodyUV*(qaBedSize-1.)+.5)/qaBedSize;
 vec2 bodyRG=texture2D(qaBed,bodyUV).rg;
 float bodyHeight=qaBedRange.x+dot(bodyRG,vec2(65280.,255.))/65535.*qaBedRange.y;
 float bodyDepth=max(0.,worldP.y-bodyHeight);
 float bodyBlend=smoothstep(.10,.85,bodyDepth);
 vec3 base=mix(uInk0*.72,vec3(.16,.29,.22),bodyBlend);`).replace('base=mix(uInk0*.72,sediment,shallow*.85);','base=mix(base,sediment,shallow*.85);');
 }
 };material.customProgramCacheKey=()=>key+'|qa-depth-bank-v2|'+world.state.biome+(balancedBank?'|balanced-bank':'');
 geometry.userData.naturalWaterMaterial=material;
 const release=()=>{material.removeEventListener('dispose',release);texture.dispose();};material.addEventListener('dispose',release);
 geometry.userData.naturalWaterBed={nx,nz,bytes:bytes.byteLength,minX,minZ,width,height,lo,span};
}

export function prepareNaturalAssetWater(world,mesh,cx,cz){
 const proxy=new THREE.BufferGeometry();proxy.setAttribute('position',new THREE.Float32BufferAttribute([-24,0,-24,24,0,24],3));
 prepareNaturalWater(world,proxy,cx,cz,mesh.material);
 if(proxy.userData.naturalWaterMaterial)mesh.userData.naturalWaterBed=proxy.userData.naturalWaterBed;
 if(mesh.material!==undefined&&proxy.userData.naturalWaterMaterial){
 const g=mesh.geometry,p=g.attributes.position,d=new Float32Array(p.count);
 // Asset water is a triangle fan: center, outline[j], outline[j+1].
 if(!g.getAttribute('qaEdgeDistance')){
 let radius=Infinity;
 const cx0=p.getX(0),cz0=p.getZ(0);
 for(let i=0;i<p.count;i+=3){const ax=p.getX(i+1),az=p.getZ(i+1),bx=p.getX(i+2),bz=p.getZ(i+2),dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((cx0-ax)*dx+(cz0-az)*dz)/(dx*dx+dz*dz)));radius=Math.min(radius,Math.hypot(cx0-ax-t*dx,cz0-az-t*dz));}
 for(let i=0;i<p.count;i+=3)d[i]=radius;
 g.setAttribute('qaEdgeDistance',new THREE.BufferAttribute(d,1));
 }
 const compile=mesh.material.onBeforeCompile,key=mesh.material.customProgramCacheKey();
 mesh.material.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);
 shader.vertexShader='attribute float qaEdgeDistance;varying float vQaEdgeDistance;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vQaEdgeDistance=qaEdgeDistance;
 #ifdef USE_INSTANCING
 vQaEdgeDistance*=min(length(instanceMatrix[0].xyz),length(instanceMatrix[2].xyz));
 #endif
 `);
 shader.fragmentShader='varying float vQaEdgeDistance;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('diffuseColor.a*=smoothstep(qaEdge,qaEdge+qaWidth,qaDepth);',`float qaBoundary=mix(.08,.65,qaLarge)+qaFine*.10;
 diffuseColor.a*=smoothstep(qaBoundary,qaBoundary+.45,vQaEdgeDistance);
 if(uSurfaceLava<.5)diffuseColor.a*=smoothstep(0.,.10,qaDepth);`);
 };mesh.material.customProgramCacheKey=()=>key+'|outline-v1';
 }
 proxy.dispose();
}
