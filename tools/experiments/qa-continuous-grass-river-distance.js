// QA-only spherical near LOD; horizontal coverage radius remains unchanged.
// Isolated Grand River pilot, derived from Savanna helper SHA256 b4a9ae2269a53623bd9e40969ed83be31c1cdabce5ad4c90ffe4d04ea15e0a5b.
import * as THREE from 'three';
import {hashCell} from '/src/world/terrain.js';
import {footprintDistance} from '/src/world/footprints.js';
import {markGroundDetailEvent} from '/src/rendering/blender-ground-details.js';
import {observeGameEvents} from '/src/simulation/game.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const vertex=`
in vec4 coverageAnchor,coverageData;in vec2 coverageSlope;in vec3 flatPosition,bladeRoot;
uniform float uCoverageTime,uCoverageWindStrength,uCoverageRefined,uCoverageSpacing,uCoverageFar,uCoverageDiagnostic;
uniform sampler2D uCoverageColor;uniform vec2 uCoverageSeed;uniform float uCoverageScale;
uniform mat4 uNativeLightVP;uniform float uNativeShadowOn;uniform vec3 uNativeShadowLight;
uniform float uNight,uNightLight,uExposure;uniform vec3 uLightDir;
out vec3 vCoverageColor,vCoverageSun,vCoverageShadow;out float vCoverageTip;
void main(){
 float ca=cos(coverageData.x),sa=sin(coverageData.x);mat2 turn=mat2(ca,-sa,sa,ca);
 vec3 root=coverageAnchor.xyz;vec3 localRoot=vec3(turn*bladeRoot.xz*uCoverageSpacing,0.).xzy;
 vec3 rootWorld=(modelMatrix*vec4(root,1.)).xyz;
 float distanceToEye=length(cameraPosition.xz-rootWorld.xz);
 float farFade=1.-smoothstep(uCoverageFar-12.,uCoverageFar,distanceToEye);
 float lod=1.-smoothstep(18.,24.,length(cameraPosition-rootWorld));
 float extra=uv.y>=8./12.?lod:1.;float growth=farFade*extra;
 vec3 pos=mix(flatPosition,position,lod*uCoverageRefined);
 pos=bladeRoot+(pos-bladeRoot)*growth;pos.xz=turn*pos.xz*uCoverageSpacing;
 pos.y*=coverageAnchor.w;pos.y+=dot(coverageSlope,pos.xz);
 vec2 windDirection=normalize(vec2(1.,.38));
 float wave=.65*sin(uCoverageTime*1.15+dot(root.xz,vec2(.21,.13)))+.35*sin(uCoverageTime*2.4+dot(root.xz,vec2(.57,-.31))+uv.y*4.);
 float bend=uCoverageRefined*.50*uCoverageWindStrength*wave*pow(max(position.y*coverageAnchor.w,0.),2.)*growth;
 pos.xz+=windDirection*bend;
 vec3 worldP=(modelMatrix*vec4(root+pos,1.)).xyz;
 vec3 N=normal;N.xz=turn*N.xz;N.y-=uCoverageRefined*uCoverageWindStrength*wave*position.y*dot(N.xz,windDirection);N=normalize(N+vec3(0.,.45,0.));
 vec4 light=uNativeLightVP*vec4(rootWorld+vec3(0.,.12,0.),1.);vCoverageShadow=light.xyz/light.w*.5+.5;
 vec2 tileUV=mat2(.8,-.6,.6,.8)*(root.xz+pos.xz)*uCoverageScale+uCoverageSeed;
 vec3 pigment=textureLod(uCoverageColor,tileUV,2.).rgb*vec3(.93,1.08,.84);
 pigment*=.88+.20*coverageData.y;
 vec3 dayShade=vec3(.17,.28,.34),nightShade=vec3(.095,.17,.32)*uNightLight;
 vec3 sun=mix(vec3(1.55,1.42,1.02),vec3(.22,.36,.66)*uNightLight,uNight);
 float drive=.35+.65*max(dot(N,uLightDir),0.);
 vec3 base=pow(clamp(pigment,0.,1.),vec3(2.2))*(.63+.37*uv.x)*uExposure;
 vCoverageColor=base*mix(dayShade,nightShade,uNight);vCoverageSun=base*sun*drive;vCoverageTip=uv.x;
 gl_Position=projectionMatrix*viewMatrix*vec4(worldP,1.);
}`;
const fragment=`out vec4 coverageOutput;
#define gl_FragColor coverageOutput
in vec3 vCoverageColor,vCoverageSun,vCoverageShadow;in float vCoverageTip;
uniform float uCoverageDiagnostic,uNativeShadowOn;uniform highp sampler2DShadow uNativeShadowFiltered;
void main(){
 if(uCoverageDiagnostic>.5){gl_FragColor=vec4(vec3(.0625),1.);return;}
 float visibility=1.;vec3 sp=vCoverageShadow;
 if(uNativeShadowOn>.5&&all(greaterThan(sp,vec3(0.)))&&all(lessThan(sp,vec3(1.))))visibility=texture(uNativeShadowFiltered,vec3(sp.xy,sp.z-.0007));
 vec3 lit=vCoverageColor+vCoverageSun*mix(.07,1.,visibility);
 gl_FragColor=vec4(clamp((lit*(2.51*lit+.03))/(lit*(2.43*lit+.59)+.14),0.,1.),1.);
 #include <colorspace_fragment>
}`;
function geometry(data,capacity){const g=new THREE.InstancedBufferGeometry();for(const [name,size]of [['position',3],['normal',3],['flatPosition',3],['bladeRoot',3],['uv',2]])g.setAttribute(name,new THREE.Float32BufferAttribute(data[name],size));g.setIndex(data.index);g.setAttribute('coverageAnchor',new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4));g.setAttribute('coverageData',new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4));g.setAttribute('coverageSlope',new THREE.InstancedBufferAttribute(new Float32Array(capacity*2),2));g.instanceCount=0;return g;}
export async function applyMaterialStudy(world,variant='A'){
 if(world.state.biome!=='gran-rio')throw Error('Grand River pilot only');
 if(!world.qaContinuousGrass){
 const modules=await(await fetch('/assets/visual-lab/continuous-grass/modules.json')).json();
 const q={variant:'A',chunks:new Map(),tiles:new Map(),dirty:true,enabled:true,timeOverride:0,stats:{buildMs:0,selectionMs:0,selectionCount:0,candidates:0,masked:0,overflow:0},signature:'',near:0,far:0};world.qaContinuousGrass=q;
 const low=world.quality==='baja';q.spacing=low?.5:.4;q.farDistance=low?40:48;q.nearDistance=low?0:24;
 const group=new THREE.Group();group.name='qa-continuous-herbaceous-cover';group.userData.materialRegistryExcluded=true;world.scene.add(group);q.group=group;
 const first=world.terrainMeshes.find(m=>m.material.userData.biomeGround).material.userData.biomeGround;
 q.uniforms={...world.toon.uniforms,...world.toon.shadowUniforms,uCoverageTime:{value:0},uCoverageWindStrength:{value:8},uCoverageRefined:{value:0},uCoverageSpacing:{value:q.spacing/.4},uCoverageFar:{value:q.farDistance},uCoverageColor:first.uGroundDetailMap,uCoverageSeed:first.uGroundSeed,uCoverageScale:{value:first.uGroundParams.value.x},uCoverageDiagnostic:{value:0}};
 q.meshes=[['refined',12000],['light',18000]].map(([name,capacity])=>{const g=geometry(modules[name],capacity);const m=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{...q.uniforms,uCoverageRefined:{value:0}},glslVersion:THREE.GLSL3,side:THREE.DoubleSide,transparent:false,depthWrite:true,toneMapped:false});const mesh=new THREE.Mesh(g,m);mesh.name='coverage-'+name;mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);return {mesh,capacity,data:modules[name]}});
 function blockers(){const buckets=new Map();const add=(o,minX,minZ,maxX,maxZ)=>{for(let x=Math.floor((minX-.7)/8);x<=Math.floor((maxX+.7)/8);x++)for(let z=Math.floor((minZ-.7)/8);z<=Math.floor((maxZ+.7)/8);z++){const key=x+','+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o)}};
 // Read existing obstacle footprints once per invalidation; never invoke navigation/engine queries.
 for(const o of world.nav.obstacles??[]){if(o.kind==='shield')continue;const p=o.footprint;if(p?.length)add({polygon:p.map(v=>({x:v.x,z:v.z}))},Math.min(...p.map(v=>v.x)),Math.min(...p.map(v=>v.z)),Math.max(...p.map(v=>v.x)),Math.max(...p.map(v=>v.z)));else if(Number.isFinite(o.x)&&Number.isFinite(o.z)){const r=o.radius??.5;add({x:o.x,z:o.z,r},o.x-r,o.z-r,o.x+r,o.z+r)}}
 for(const p of world.state.plants.filter(p=>p.alive!==false))add({x:p.x,z:p.z,r:1.6},p.x-1.6,p.z-1.6,p.x+1.6,p.z+1.6);
 return buckets;}
 q.blockers=blockers();
 function invalidateWaterNeighbors(cx,cz){for(const [key,t]of q.tiles)if((t.tx+1)*8>cx*48-24-.6&&t.tx*8<cx*48+24+.6&&(t.tz+1)*8>cz*48-24-.6&&t.tz*8<cz*48+24+.6)q.tiles.delete(key);q.dirty=true;}
 function chunk(cx,cz){const key=cx+','+cz,source=world.chunks.get(key),ground=source?.children.find(o=>o.userData.ground);if(!ground)return;const start=performance.now(),p=ground.geometry.attributes.position,h=new Float32Array(49*49),seen=new Uint8Array(49*49);
 for(let i=0;i<p.count;i++){const x=Math.round(p.getX(i)+24),z=Math.round(p.getZ(i)+24);if(x>=0&&x<=48&&z>=0&&z<=48){h[z*49+x]=p.getY(i);seen[z*49+x]=1}}
 if(seen.some(x=>!x))throw Error('Coverage requires resident 49x49 renderer height lattice');
 const mask=ground.material.userData.biomeGround.uGroundMask.value.image;const water=[],waterTriangles=new Map();let waterTriangleCount=0;const mat=new THREE.Matrix4(),box=new THREE.Box3();
 for(const mesh of source.children.filter(m=>m.userData.nativeFluid)){
 if(mesh.userData.nativeFluid==='chunk'){
 const position=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?.count??position.count;
 for(let i=0;i<count;i+=3){const tri=[];for(let j=0;j<3;j++){const k=index?index.getX(i+j):i+j;tri.push(position.getX(k)+cx*48,position.getZ(k)+cz*48);}
 const area=(tri[2]-tri[0])*(tri[5]-tri[1])-(tri[3]-tri[1])*(tri[4]-tri[0]);if(Math.abs(area)<1e-9)continue;
 waterTriangleCount++;const minX=Math.min(tri[0],tri[2],tri[4])-.6,maxX=Math.max(tri[0],tri[2],tri[4])+.6,minZ=Math.min(tri[1],tri[3],tri[5])-.6,maxZ=Math.max(tri[1],tri[3],tri[5])+.6;
 for(let bx=Math.floor(minX/8);bx<=Math.floor(maxX/8);bx++)for(let bz=Math.floor(minZ/8);bz<=Math.floor(maxZ/8);bz++){const key=bx+','+bz;if(!waterTriangles.has(key))waterTriangles.set(key,[]);waterTriangles.get(key).push(tri);}
 }continue;}
 mesh.geometry.computeBoundingBox();if(mesh.isInstancedMesh){for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,mat);box.copy(mesh.geometry.boundingBox).applyMatrix4(mat);water.push([box.min.x+cx*48,box.min.z+cz*48,box.max.x+cx*48,box.max.z+cz*48])}}else{box.copy(mesh.geometry.boundingBox);water.push([box.min.x+cx*48,box.min.z+cz*48,box.max.x+cx*48,box.max.z+cz*48])}}
 q.chunks.set(key,{cx,cz,h,mask,water,waterTriangles,waterTriangleCount});invalidateWaterNeighbors(cx,cz);q.stats.buildMs+=performance.now()-start;}
 function nearWaterChunk(c,x,z){
 if(c.water.some(b=>x>b[0]-.6&&x<b[2]+.6&&z>b[1]-.6&&z<b[3]+.6))return true;
 for(const t of c.waterTriangles.get(Math.floor(x/8)+','+Math.floor(z/8))??[]){
 const a=(t[2]-t[0])*(z-t[1])-(t[3]-t[1])*(x-t[0]),b=(t[4]-t[2])*(z-t[3])-(t[5]-t[3])*(x-t[2]),d=(t[0]-t[4])*(z-t[5])-(t[1]-t[5])*(x-t[4]);
 if((a>=0&&b>=0&&d>=0)||(a<=0&&b<=0&&d<=0))return true;
 for(let i=0;i<3;i++){const j=(i+1)%3,ax=t[i*2],az=t[i*2+1],dx=t[j*2]-ax,dz=t[j*2+1]-az,u=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1),0,1);if((x-ax-u*dx)**2+(z-az-u*dz)**2<.36)return true;}
 }return false;}
 function nearWater(c,x,z){
 const xs=[c.cx],zs=[c.cz];if(x<c.cx*48-24+.6)xs.push(c.cx-1);if(x>c.cx*48+24-.6)xs.push(c.cx+1);if(z<c.cz*48-24+.6)zs.push(c.cz-1);if(z>c.cz*48+24-.6)zs.push(c.cz+1);
 for(const cx of xs)for(const cz of zs){const neighbor=q.chunks.get(cx+','+cz);if(neighbor&&nearWaterChunk(neighbor,x,z))return true;}return false;
 }
 function sample(c,x,z){const lx=clamp(x-(c.cx*48-24),0,47.99999),lz=clamp(z-(c.cz*48-24),0,47.99999),ix=Math.floor(lx),iz=Math.floor(lz),fx=lx-ix,fz=lz-iz;
 const a=c.h[iz*49+ix],b=c.h[iz*49+ix+1],d=c.h[(iz+1)*49+ix],e=c.h[(iz+1)*49+ix+1];let y,sx,sz;if(fx+fz<=1){sx=b-a;sz=d-a;y=a+fx*sx+fz*sz}else{sx=e-d;sz=e-b;y=e-(1-fx)*sx-(1-fz)*sz}
 const mx=clamp(lx/1.5+1,0,33.9999),mz=clamp(lz/1.5+1,0,33.9999),gx=Math.floor(mx),gz=Math.floor(mz),tx=mx-gx,tz=mz-gz,ctx=[];
 for(let k=0;k<4;k++){const at=(xx,zz)=>c.mask.data[(zz*35+xx)*4+k]/255;ctx.push((at(gx,gz)*(1-tx)+at(gx+1,gz)*tx)*(1-tz)+(at(gx,gz+1)*(1-tx)+at(gx+1,gz+1)*tx)*tz)}return {y,sx,sz,ctx};}
 function tile(c,tx,tz){const key=tx+','+tz;if(q.tiles.has(key))return q.tiles.get(key);const start=performance.now(),items=[],step=q.spacing,seed=world.nav.field.seed;
 for(let ix=Math.ceil(tx*8/step);ix<(tx+1)*8/step-1e-6;ix++)for(let iz=Math.ceil(tz*8/step);iz<(tz+1)*8/step-1e-6;iz++){
 const bits=hashCell(seed,ix,iz,8371),x=(ix+.5)*step+((bits&255)/255-.5)*step*.25,z=(iz+.5)*step+(((bits>>>8)&255)/255-.5)*step*.25;
 if(x<c.cx*48-24||x>=c.cx*48+24||z<c.cz*48-24||z>=c.cz*48+24)continue;
 const s=sample(c,x,z),[cover,meso,moisture,wear]=s.ctx;q.stats.candidates++;
 if(cover<.20||moisture<.20||wear>.25||Math.hypot(s.sx,s.sz)>.42||nearWater(c,x,z)||(q.blockers.get(Math.floor(x/8)+','+Math.floor(z/8))??[]).some(o=>o.polygon?footprintDistance(o.polygon,x,z)<.6:Math.hypot(x-o.x,z-o.z)<o.r+.6)){q.stats.masked++;continue;}
 // Check the footprint against the resident wear mask, keeping leaf reach off paths.
 if([[.6,0],[-.6,0],[0,.6],[0,-.6],[.42,.42],[-.42,.42],[.42,-.42],[-.42,-.42]].some(([dx,dz])=>sample(c,x+dx,z+dz).ctx[3]>.27)){q.stats.masked++;continue;}
 items.push([x,s.y+.006,z,(.65+.25*((bits>>>16)&255)/255)*clamp((cover-.20)/.12,0,1)*clamp((moisture-.20)/.12,0,1),bits/4294967296*Math.PI*2,meso*.65+moisture*.35,cover,moisture,s.sx,s.sz]);}
 const result={chunk:c.cx+','+c.cz,tx,tz,items};q.tiles.set(key,result);q.stats.buildMs+=performance.now()-start;return result;}
 const old=world.scene.onBeforeRender,frustum=new THREE.Frustum(),vp=new THREE.Matrix4(),sphere=new THREE.Sphere(new THREE.Vector3(),6.5);
 function select(){const start=performance.now(),camera=world.camera,eyeX=camera.position.x-world.scene.position.x,eyeZ=camera.position.z-world.scene.position.z;vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(vp);const bins=[[],[]],visibleTiles=[];q.stats.overflow=0;
 for(const c of q.chunks.values())for(let tx=Math.floor((c.cx*48-24)/8);tx<(c.cx*48+24)/8;tx++)for(let tz=Math.floor((c.cz*48-24)/8);tz<(c.cz*48+24)/8;tz++){
 const x=tx*8+4,z=tz*8+4;if(Math.hypot(x-eyeX,z-eyeZ)>q.farDistance+6)continue;const y=sample(c,x,z).y;sphere.center.set(x+world.scene.position.x,y+world.scene.position.y+.2,z+world.scene.position.z);if(!frustum.intersectsSphere(sphere))continue;
 visibleTiles.push({c,tx,tz,dist:Math.hypot(x-eyeX,z-eyeZ)});}
 visibleTiles.sort((a,b)=>a.dist-b.dist||a.tx-b.tx||a.tz-b.tz);
 for(const {c,tx,tz}of visibleTiles)for(const p of tile(c,tx,tz).items){const dist=Math.hypot(p[0]-eyeX,p[2]-eyeZ);if(dist>q.farDistance)continue;bins[q.variant==='C'&&Math.hypot(p[0]-eyeX,p[1]+world.scene.position.y-camera.position.y,p[2]-eyeZ)<q.nearDistance?0:1].push(p);}
 for(let k=0;k<2;k++){const entry=q.meshes[k],g=entry.mesh.geometry,bin=bins[k];q.stats.overflow+=Math.max(0,bin.length-entry.capacity);const count=Math.min(entry.capacity,bin.length);for(let i=0;i<count;i++){const p=bin[i];for(let j=0;j<4;j++){g.attributes.coverageAnchor.array[i*4+j]=p[j];g.attributes.coverageData.array[i*4+j]=p[j+4]}g.attributes.coverageSlope.array[i*2]=p[8];g.attributes.coverageSlope.array[i*2+1]=p[9]}for(const name of ['coverageAnchor','coverageData','coverageSlope'])g.attributes[name].needsUpdate=true;g.instanceCount=count;entry.mesh.visible=q.variant!=='A'&&count>0;}q.near=q.meshes[0].mesh.geometry.instanceCount;q.far=q.meshes[1].mesh.geometry.instanceCount;q.stats.selectionMs+=performance.now()-start;q.stats.selectionCount++;q.dirty=false;}
 world.scene.onBeforeRender=function(...args){old?.apply(this,args);q.uniforms.uCoverageTime.value=q.timeOverride??world.state.elapsed;const camera=world.camera,key=[Math.round((camera.position.x-world.scene.position.x)*2),Math.round(camera.position.y*2),Math.round((camera.position.z-world.scene.position.z)*2),...camera.quaternion.toArray().map(v=>v.toFixed(2)),q.variant].join('|');if(q.variant!=='A'&&(q.dirty||key!==q.signature)){q.signature=key;select()}};
 q.rebuild=()=>{q.dirty=true};q.chunk=chunk;q.release=key=>{q.chunks.delete(key);const [cx,cz]=key.split(',').map(Number);invalidateWaterNeighbors(cx,cz)};q.markDirtyAt=()=>{q.occupancyDirty=true};q.flush=()=>{if(q.occupancyDirty){q.blockers=blockers();q.tiles.clear();q.dirty=true;q.occupancyDirty=false}};
 q.dispose=()=>{world.scene.onBeforeRender=old;q.releaseEvents?.();world.scene.remove(group);for(const e of q.meshes){e.mesh.geometry.dispose();e.mesh.material.dispose()}q.chunks.clear();q.tiles.clear()};
 world.groundDetails.dispose();world.groundDetails=q;
 for(const key of world.chunks.keys()){const [cx,cz]=key.split(',').map(Number);chunk(cx,cz)}
 q.releaseEvents=observeGameEvents(world.state,e=>markGroundDetailEvent(q,world.state,e,id=>world.objects.get(id)?.position));
 q.audit=()=>({variant:q.variant,active:q.variant!=='A',nearDistance:q.nearDistance,moduleSpacing:q.spacing,near:q.near,far:q.far,leaves:q.near*12+q.far*8,triangles:q.near*60+q.far*8,waterTriangles:[...q.chunks.values()].reduce((n,c)=>n+c.waterTriangleCount,0),waterBucketReferences:[...q.chunks.values()].reduce((n,c)=>n+[...c.waterTriangles.values()].reduce((s,t)=>s+t.length,0),0),chunks:q.chunks.size,cachedTiles:q.tiles.size,bufferBytes:q.meshes.reduce((s,e)=>s+Object.values(e.mesh.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(e.mesh.geometry.index?.array.byteLength??0),0),stats:{...q.stats},engineQueries:0,castShadow:false});
 }
 const q=world.qaContinuousGrass;q.variant=variant;q.group.visible=variant!=='A';q.dirty=true;for(const e of q.meshes)e.mesh.material.uniforms.uCoverageRefined.value=variant==='C'?1:0;return q.audit();
}

export {THREE};
