import {mangroveFernEnabled} from './mangrove-fern-option.js';
import {createCropSoilMasks,cropSoilEnabled} from './crop-soil-mask.js';
import {syncSelectedGrassMask,disposeSelectedGrassMask} from './grass-underlay-mask.js';
import {prepareMangroveLeaves,mangroveLeafShader,cuppedMangroveLeavesEnabled,variedMangroveDistributionEnabled} from './mangrove-leaf-cover.js';
import {markGroundDetailEvent} from './blender-ground-details.js';
import * as THREE from 'three';
import {hashCell,noise} from '../world/terrain.js';
import {footprintDistance} from '../world/footprints.js';
import {observeGameEvents} from '../simulation/game.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const vertex=`
in vec4 coverageAnchor,coverageData;in vec2 coverageSlope;in vec3 flatPosition,bladeRoot,flatNormal;
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
 float lod=1.-smoothstep(18.,24.,distanceToEye);
 float extra=uv.y>=8./12.?lod:1.;float growth=farFade*extra;
 vec3 pos=mix(flatPosition,position,lod*uCoverageRefined);
 pos=bladeRoot+(pos-bladeRoot)*growth;pos.xz=turn*pos.xz*uCoverageSpacing;
 pos.y*=coverageAnchor.w;pos.y+=dot(coverageSlope,pos.xz);
 vec2 windDirection=normalize(vec2(1.,.38));
 float wave=.65*sin(uCoverageTime*1.15+dot(root.xz,vec2(.21,.13)))+.35*sin(uCoverageTime*2.4+dot(root.xz,vec2(.57,-.31))+uv.y*4.);
 float bend=lod*uCoverageRefined*.50*uCoverageWindStrength*wave*pow(max(position.y*coverageAnchor.w,0.),2.)*growth;
 pos.xz+=windDirection*bend;
 vec3 worldP=(modelMatrix*vec4(root+pos,1.)).xyz;
 vec3 N=normalize(mix(flatNormal,normal,lod*uCoverageRefined));N.xz=turn*N.xz;N.y-=lod*uCoverageRefined*uCoverageWindStrength*wave*position.y*dot(N.xz,windDirection);N=normalize(N+vec3(0.,.45,0.));
 vec4 light=uNativeLightVP*vec4(rootWorld+vec3(0.,.12,0.),1.);vCoverageShadow=light.xyz/light.w*.5+.5;
 vec2 tileUV=mat2(.8,-.6,.6,.8)*(root.xz+pos.xz*lod)*uCoverageScale+uCoverageSeed;
 vec3 pigment=textureLod(uCoverageColor,tileUV,2.).rgb*vec3(1.14,1.09,.97);
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
function geometry(data,capacity){const g=new THREE.InstancedBufferGeometry();for(const [name,size]of [['position',3],['normal',3],['flatPosition',3],['bladeRoot',3],['flatNormal',3],['uv',2]])g.setAttribute(name,new THREE.Float32BufferAttribute(data[name],size));g.setIndex(data.index);g.setAttribute('coverageAnchor',new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4));g.setAttribute('coverageData',new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4));g.setAttribute('coverageSlope',new THREE.InstancedBufferAttribute(new Float32Array(capacity*2),2));g.instanceCount=0;return g;}
export function continuousGrassEnabled(biome,search=globalThis.location?.search??''){
 const params=new URLSearchParams(search);
 return ['sabana','gran-rio','manglares'].includes(biome)&&params.get('visualLab')==='global-lighting'&&params.get('grassCoverage')==='continuous';
}
// Scene-owned visual layer. Resident render geometry and confirmed events are
// its only spatial inputs; borrowed terrain textures remain owned by BiomeGround.
export async function createContinuousGrass(world){
 const river=world.state.biome==='gran-rio',mangrove=world.state.biome==='manglares';
 if(!river&&!mangrove&&world.state.biome!=='sabana')throw Error('Unsupported continuous coverage biome');
 const fern=mangrove&&mangroveFernEnabled();
 const cropSoil=river&&cropSoilEnabled()?createCropSoilMasks():null;
 const cupped=mangrove&&cuppedMangroveLeavesEnabled(),varied=mangrove&&variedMangroveDistributionEnabled();
 const raw=await(await fetch(cupped?'/assets/visual-lab/mangrove-leaf-cupped-20261022/modules.json':mangrove?'/assets/visual-lab/mangrove-leaf-fill-20261021/modules.json':'/assets/visual-lab/continuous-grass/modules.json',{signal:world.loading?.signal})).json();
 const modules=mangrove&&!cupped?prepareMangroveLeaves(raw):raw;
 if(world.disposed||world.loading?.signal.aborted)throw Error('Coverage loading cancelled');
 const q={variant:'C',chunks:new Map(),tiles:new Map(),dirty:true,enabled:true,timeOverride:null,stats:{buildMs:0,selectionMs:0,selectionCount:0,candidates:0,masked:0,overflow:0},signature:'',near:0,far:0};
 const low=['baja','muy_baja'].includes(world.quality);q.spacing=mangrove?(fern?(low?.75:.65):(low?.6:.5)):(low?.5:.4);q.farDistance=low?40:48;q.nearDistance=low?0:24;
 q.edgePadding=river?.85:.6;
 const vertexShader=mangrove?mangroveLeafShader(vertex,varied):river?vertex.replace('vec3(1.14,1.09,.97)','vec3(1.14,1.18,1.05)').replace('dayShade=vec3(.17,.28,.34)','dayShade=vec3(.14,.26,.32)').replace('vec3(1.55,1.42,1.02)','vec3(1.77,1.79,1.42)').replace('nightShade=vec3(.095,.17,.32)','nightShade=vec3(.24,.36,.48)'):vertex;
 const group=new THREE.Group();group.name='continuous-herbaceous-cover';group.userData.materialRegistryExcluded=true;world.scene.add(group);q.group=group;
 const first=world.terrainMeshes.find(m=>m.material.userData.biomeGround).material.userData.biomeGround;
 q.uniforms={...world.toon.uniforms,...world.toon.shadowUniforms,uCoverageTime:{value:0},uCoverageWindStrength:{value:8},uCoverageRefined:{value:1},uCoverageSpacing:{value:mangrove?1:q.spacing/.4},uCoverageFar:{value:q.farDistance},uCoverageColor:first.uGroundDetailMap,uCoverageSeed:first.uGroundSeed,uCoverageScale:{value:first.uGroundParams.value.x},uCoverageDiagnostic:{value:0}};
 if(!mangrove)for(const data of Object.values(modules)){data.flatNormal=[];for(let i=0;i<data.uv.length/2;i++){const leaf=Math.round(data.uv[i*2+1]*12);const n=leaf<8?modules.light.normal.slice(leaf*9,leaf*9+3):data.normal.slice(i*3,i*3+3);data.flatNormal.push(...n);}}
 q.meshes=[['refined',12000],['light',18000]].map(([name,capacity])=>{const g=geometry(modules[name],capacity);const m=new THREE.ShaderMaterial({vertexShader,fragmentShader:fragment,uniforms:{...q.uniforms,uCoverageRefined:{value:1}},glslVersion:THREE.GLSL3,side:THREE.DoubleSide,transparent:false,depthWrite:true,toneMapped:false});const mesh=new THREE.Mesh(g,m);mesh.name='coverage-'+name;mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);return {mesh,capacity,data:modules[name]}});
 function blockers(){const buckets=new Map();const add=(o,minX,minZ,maxX,maxZ)=>{for(let x=Math.floor((minX-q.edgePadding-.1)/8);x<=Math.floor((maxX+q.edgePadding+.1)/8);x++)for(let z=Math.floor((minZ-q.edgePadding-.1)/8);z<=Math.floor((maxZ+q.edgePadding+.1)/8);z++){const key=x+','+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o)}};
 // Read existing obstacle footprints once per invalidation; never invoke navigation/engine queries.
 for(const o of world.nav.obstacles??[]){if(o.kind==='shield')continue;const p=o.footprint;if(p?.length)add({polygon:p.map(v=>({x:v.x,z:v.z}))},Math.min(...p.map(v=>v.x)),Math.min(...p.map(v=>v.z)),Math.max(...p.map(v=>v.x)),Math.max(...p.map(v=>v.z)));else if(Number.isFinite(o.x)&&Number.isFinite(o.z)){const r=o.radius??.5;add({x:o.x,z:o.z,r},o.x-r,o.z-r,o.x+r,o.z+r)}}
 for(const p of world.state.plants.filter(p=>p.alive!==false))add({x:p.x,z:p.z,r:1.6},p.x-1.6,p.z-1.6,p.x+1.6,p.z+1.6);
 return buckets;}
 q.blockers=blockers();
 function invalidateWaterNeighbors(cx,cz){for(const [key,t]of q.tiles)if(t.chunk===cx+','+cz||(t.tx+1)*8>cx*48-24-q.edgePadding&&t.tx*8<cx*48+24+q.edgePadding&&(t.tz+1)*8>cz*48-24-q.edgePadding&&t.tz*8<cz*48+24+q.edgePadding)q.tiles.delete(key);q.dirty=true;}
 function chunk(cx,cz){const key=cx+','+cz,source=world.chunks.get(key),ground=source?.children.find(o=>o.userData.ground);if(!ground)return;const start=performance.now(),p=ground.geometry.attributes.position,h=new Float32Array(49*49),seen=new Uint8Array(49*49);
 for(let i=0;i<p.count;i++){const x=Math.round(p.getX(i)+24),z=Math.round(p.getZ(i)+24);if(x>=0&&x<=48&&z>=0&&z<=48){h[z*49+x]=p.getY(i);seen[z*49+x]=1}}
 if(seen.some(x=>!x))throw Error('Coverage requires resident 49x49 renderer height lattice');
 const cropSoilTexture=ground.material.userData.biomeGround.uGroundMask.value;const priorSoil=q.chunks.get(key)?.cropSoilTexture;if(priorSoil&&priorSoil!==cropSoilTexture)cropSoil?.release(priorSoil);cropSoil?.attach(cropSoilTexture,cx,cz,world.state.plants);const mask=cropSoilTexture.image;const water=[],waterTriangles=new Map();let waterTriangleCount=0;const mat=new THREE.Matrix4(),box=new THREE.Box3();
 for(const mesh of source.children.filter(m=>m.userData.nativeFluid)){
 if((river||mangrove)&&mesh.userData.nativeFluid==='chunk'){
 const position=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?.count??position.count;
 for(let i=0;i<count;i+=3){const tri=[];for(let j=0;j<3;j++){const k=index?index.getX(i+j):i+j;tri.push(position.getX(k)+cx*48,position.getZ(k)+cz*48);}
 const area=(tri[2]-tri[0])*(tri[5]-tri[1])-(tri[3]-tri[1])*(tri[4]-tri[0]);if(Math.abs(area)<1e-9)continue;
 waterTriangleCount++;const minX=Math.min(tri[0],tri[2],tri[4])-q.edgePadding,maxX=Math.max(tri[0],tri[2],tri[4])+q.edgePadding,minZ=Math.min(tri[1],tri[3],tri[5])-q.edgePadding,maxZ=Math.max(tri[1],tri[3],tri[5])+q.edgePadding;
 for(let bx=Math.floor(minX/8);bx<=Math.floor(maxX/8);bx++)for(let bz=Math.floor(minZ/8);bz<=Math.floor(maxZ/8);bz++){const key=bx+','+bz;if(!waterTriangles.has(key))waterTriangles.set(key,[]);waterTriangles.get(key).push(tri);}
 }continue;}
 mesh.geometry.computeBoundingBox();if(mesh.isInstancedMesh){for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,mat);box.copy(mesh.geometry.boundingBox).applyMatrix4(mat);water.push([box.min.x+cx*48,box.min.z+cz*48,box.max.x+cx*48,box.max.z+cz*48])}}else{box.copy(mesh.geometry.boundingBox);water.push([box.min.x+cx*48,box.min.z+cz*48,box.max.x+cx*48,box.max.z+cz*48])}}
 q.chunks.set(key,{cx,cz,h,mask,cropSoilTexture,water,waterTriangles,waterTriangleCount});invalidateWaterNeighbors(cx,cz);q.stats.buildMs+=performance.now()-start;}
 function nearWaterChunk(c,x,z){
 if(c.water.some(b=>x>b[0]-q.edgePadding&&x<b[2]+q.edgePadding&&z>b[1]-q.edgePadding&&z<b[3]+q.edgePadding))return true;
 for(const t of c.waterTriangles.get(Math.floor(x/8)+','+Math.floor(z/8))??[]){
 const a=(t[2]-t[0])*(z-t[1])-(t[3]-t[1])*(x-t[0]),b=(t[4]-t[2])*(z-t[3])-(t[5]-t[3])*(x-t[2]),d=(t[0]-t[4])*(z-t[5])-(t[1]-t[5])*(x-t[4]);
 if((a>=0&&b>=0&&d>=0)||(a<=0&&b<=0&&d<=0))return true;
 for(let i=0;i<3;i++){const j=(i+1)%3,ax=t[i*2],az=t[i*2+1],dx=t[j*2]-ax,dz=t[j*2+1]-az,u=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1),0,1);if((x-ax-u*dx)**2+(z-az-u*dz)**2<q.edgePadding*q.edgePadding)return true;}
 }return false;}
 function nearWater(c,x,z){
 const xs=[c.cx],zs=[c.cz];if(x<c.cx*48-24+q.edgePadding)xs.push(c.cx-1);if(x>c.cx*48+24-q.edgePadding)xs.push(c.cx+1);if(z<c.cz*48-24+q.edgePadding)zs.push(c.cz-1);if(z>c.cz*48+24-q.edgePadding)zs.push(c.cz+1);
 for(const cx of xs)for(const cz of zs){const neighbor=q.chunks.get(cx+','+cz);if(neighbor&&nearWaterChunk(neighbor,x,z))return true;}return false;
 }
 function sample(c,x,z){const lx=clamp(x-(c.cx*48-24),0,47.99999),lz=clamp(z-(c.cz*48-24),0,47.99999),ix=Math.floor(lx),iz=Math.floor(lz),fx=lx-ix,fz=lz-iz;
 const a=c.h[iz*49+ix],b=c.h[iz*49+ix+1],d=c.h[(iz+1)*49+ix],e=c.h[(iz+1)*49+ix+1];let y,sx,sz;if(fx+fz<=1){sx=b-a;sz=d-a;y=a+fx*sx+fz*sz}else{sx=e-d;sz=e-b;y=e-(1-fx)*sx-(1-fz)*sz}
 const mx=clamp(lx/1.5+1,0,33.9999),mz=clamp(lz/1.5+1,0,33.9999),gx=Math.floor(mx),gz=Math.floor(mz),tx=mx-gx,tz=mz-gz,ctx=[];
 for(let k=0;k<4;k++){const at=(xx,zz)=>c.mask.data[(zz*35+xx)*4+k]/255;ctx.push((at(gx,gz)*(1-tx)+at(gx+1,gz)*tx)*(1-tz)+(at(gx,gz+1)*(1-tx)+at(gx+1,gz+1)*tx)*tz)}return {y,sx,sz,ctx};}
 function tile(c,tx,tz){const key=tx+','+tz;if(q.tiles.has(key))return q.tiles.get(key);const start=performance.now(),items=[],step=q.spacing,seed=world.nav.field.seed;
 for(let ix=Math.ceil(tx*8/step);ix<(tx+1)*8/step-1e-6;ix++)for(let iz=Math.ceil(tz*8/step);iz<(tz+1)*8/step-1e-6;iz++){
 const bits=hashCell(seed,ix,iz,8371),x=(ix+.5)*step+((bits&255)/255-.5)*step*(varied?.65:.25),z=(iz+.5)*step+(((bits>>>8)&255)/255-.5)*step*(varied?.65:.25);
 if(x<c.cx*48-24||x>=c.cx*48+24||z<c.cz*48-24||z>=c.cz*48+24)continue;
 const s=sample(c,x,z),[cover,meso,moisture,wear]=s.ctx;q.stats.candidates++;
 if(cover<(river?.20:.10)||(river&&moisture<.20)||wear>.25||Math.hypot(s.sx,s.sz)>.42||nearWater(c,x,z)||(q.blockers.get(Math.floor(x/8)+','+Math.floor(z/8))??[]).some(o=>o.polygon?footprintDistance(o.polygon,x,z)<q.edgePadding:Math.hypot(x-o.x,z-o.z)<o.r+q.edgePadding)){q.stats.masked++;continue;}
 // Check the footprint against the resident wear mask, keeping leaf reach off paths.
 let edgeWear=wear,fernEdgeCover=cover;for(const [dx,dz] of [[.6,0],[-.6,0],[0,.6],[0,-.6],[.42,.42],[-.42,.42],[.42,-.42],[-.42,-.42]]){const probe=sample(c,x+dx*(q.edgePadding/.6),z+dz*(q.edgePadding/.6)).ctx;edgeWear=Math.max(edgeWear,probe[3]);if(fern)fernEdgeCover=Math.min(fernEdgeCover,probe[0]);if(edgeWear>.27)break;}if(edgeWear>.27){q.stats.masked++;continue;}
 if(fern){const edge=Math.max(clamp((.42-fernEdgeCover)/.32,0,1),clamp((edgeWear-.06)/.21,0,1));if(hashCell(seed,ix,iz,21931)/4294967296<.30*edge)continue;}
 items.push([x,s.y+.006,z,(river?clamp((.27-edgeWear)/.17,0,1)*(.65+.25*((bits>>>16)&255)/255)*clamp((cover-.20)/.12,0,1)*clamp((moisture-.20)/.12,0,1):(.80+.32*((bits>>>16)&255)/255)*clamp((cover-.08)/.18,.7,1)),bits/4294967296*Math.PI*2,(varied?noise(x*.19,z*.19,seed^9581)*.65+noise(x*.71,z*.71,seed^9517)*.35:meso*.65+moisture*.35),cover,mangrove?wear:moisture,s.sx,s.sz]);}
 const result={chunk:c.cx+','+c.cz,tx,tz,items};q.tiles.set(key,result);q.stats.buildMs+=performance.now()-start;return result;}
 const screenLodHistory=new WeakMap();
 const old=world.scene.onBeforeRender,frustum=new THREE.Frustum(),vp=new THREE.Matrix4(),sphere=new THREE.Sphere(new THREE.Vector3(),6.5);
 function select(){const start=performance.now(),camera=world.camera,eyeX=camera.position.x-world.scene.position.x,eyeZ=camera.position.z-world.scene.position.z;vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(vp);const bins=[[],[]],visibleTiles=[];q.stats.overflow=0;
 for(const c of q.chunks.values())for(let tx=Math.floor((c.cx*48-24)/8);tx<(c.cx*48+24)/8;tx++)for(let tz=Math.floor((c.cz*48-24)/8);tz<(c.cz*48+24)/8;tz++){
 const x=tx*8+4,z=tz*8+4;if(Math.hypot(x-eyeX,z-eyeZ)>q.farDistance+6)continue;const y=sample(c,x,z).y;sphere.center.set(x+world.scene.position.x,y+world.scene.position.y+.2,z+world.scene.position.z);if(!frustum.intersectsSphere(sphere))continue;
 visibleTiles.push({c,tx,tz,dist:Math.hypot(x-eyeX,z-eyeZ)});}
 visibleTiles.sort((a,b)=>a.dist-b.dist||a.tx-b.tx||a.tz-b.tz);
 for(const {c,tx,tz}of visibleTiles)for(const p of tile(c,tx,tz).items){const dist=Math.hypot(p[0]-eyeX,p[2]-eyeZ);if(dist>q.farDistance)continue;let detailed=dist<q.nearDistance;
 if(q.screenLod){const v=camera.matrixWorldInverse.elements,x=p[0]+world.scene.position.x,y=p[1]+world.scene.position.y,z=p[2]+world.scene.position.z,depth=-(v[2]*x+v[6]*y+v[10]*z+v[14]);const pixels=depth>0?world.renderer.domElement.height*camera.projectionMatrix.elements[5]/depth:Infinity;const previous=screenLodHistory.get(p);detailed=q.nearDistance>0&&(previous===undefined?pixels>=64:previous?pixels>=60:pixels>=68);screenLodHistory.set(p,detailed);}
 bins[q.variant==='C'&&detailed?0:1].push(p);}
 for(let k=0;k<2;k++){const entry=q.meshes[k],g=entry.mesh.geometry,bin=bins[k];q.stats.overflow+=Math.max(0,bin.length-entry.capacity);const count=Math.min(entry.capacity,bin.length);for(let i=0;i<count;i++){const p=bin[i];for(let j=0;j<4;j++){g.attributes.coverageAnchor.array[i*4+j]=p[j];g.attributes.coverageData.array[i*4+j]=p[j+4]}g.attributes.coverageSlope.array[i*2]=p[8];g.attributes.coverageSlope.array[i*2+1]=p[9]}for(const name of ['coverageAnchor','coverageData','coverageSlope'])g.attributes[name].needsUpdate=true;g.instanceCount=count;entry.mesh.visible=q.variant!=='A'&&count>0;}q.near=q.meshes[0].mesh.geometry.instanceCount;q.far=q.meshes[1].mesh.geometry.instanceCount;if(world.biomeGround.riverUnderlay)syncSelectedGrassMask(world,q);q.stats.selectionMs+=performance.now()-start;q.stats.selectionCount++;q.dirty=false;}
 q.renderHook=world.scene.onBeforeRender=function(...args){old?.apply(this,args);if(q.disposed)return;if(world.biomeGround.riverUnderlay)world.biomeGround.coverageUnderlay?.value.set(q.group.visible&&q.variant!=="A"&&q.quality!=="muy_baja"&&!q.stats.overflow?1:0,q.farDistance);q.uniforms.uCoverageTime.value=q.timeOverride??world.state.elapsed;const camera=world.camera,key=[Math.round((camera.position.x-world.scene.position.x)*2),Math.round(camera.position.y*2),Math.round((camera.position.z-world.scene.position.z)*2),...camera.quaternion.toArray().map(v=>v.toFixed(2)),...camera.projectionMatrix.elements,q.variant].join('|');if(q.quality!=='muy_baja'&&q.variant!=='A'&&(q.dirty||key!==q.signature)){q.signature=key;select()}q.syncLod?.();};
 q.configureQuality=quality=>{
  if(q.quality===quality)return;
  q.quality=quality;const low=['baja','muy_baja'].includes(quality);
  q.spacing=mangrove?(fern?(low?.75:.65):(low?.6:.5)):(low?.5:.4);q.farDistance=low?40:48;q.nearDistance=low?0:24;
  q.uniforms.uCoverageSpacing.value=mangrove?1:q.spacing/.4;q.uniforms.uCoverageFar.value=q.farDistance;
  q.group.visible=quality!=='muy_baja'&&q.variant!=='A';q.tiles.clear();q.dirty=true;
 };
 q.configureQuality(world.quality);
 q.rebuild=()=>{q.dirty=true};q.chunk=chunk;q.release=key=>{cropSoil?.release(q.chunks.get(key)?.cropSoilTexture);q.chunks.delete(key);const [cx,cz]=key.split(',').map(Number);invalidateWaterNeighbors(cx,cz)};q.markDirtyAt=()=>{q.occupancyDirty=true};q.flush=()=>{if(q.occupancyDirty){cropSoil?.flush(world.state.plants);q.blockers=blockers();q.tiles.clear();q.dirty=true;q.occupancyDirty=false}};
 q.dispose=()=>{
  if(q.disposed)return;if(world.biomeGround.riverUnderlay){disposeSelectedGrassMask(q);world.biomeGround.coverageUnderlay?.value.set(0,q.farDistance);}q.disposed=true;q.enabled=false;q.group.visible=false;
  if(world.scene.onBeforeRender===q.renderHook)world.scene.onBeforeRender=old;
  q.releaseEvents?.();q.releaseEvents=null;cropSoil?.dispose();world.scene.remove(q.group);
  for(const entry of q.meshes){entry.mesh.geometry.dispose();entry.mesh.material.dispose();}
  q.chunks.clear();q.tiles.clear();q.blockers.clear();
 };
 for(const key of world.chunks.keys()){const [cx,cz]=key.split(',').map(Number);chunk(cx,cz)}
 q.releaseEvents=observeGameEvents(world.state,event=>{markGroundDetailEvent(q,world.state,event,id=>world.objects.get(id)?.position);if(cropSoil&&['CropPlaced','CropPicked','CropDestroyed'].includes(event.type)){cropSoil.invalidate();q.occupancyDirty=true;}});
 q.audit=()=>({distribution:varied?'varied':'original',leafShape:mangrove?(cupped?'cupped':'original'):null,variant:q.variant,active:q.group.visible&&!q.disposed,quality:q.quality,biome:world.state.biome,edgePadding:q.edgePadding,nearDistance:q.nearDistance,moduleSpacing:q.spacing,near:q.near,far:q.far,leaves:q.near*(mangrove?8:12)+q.far*(mangrove?4:8),triangles:q.meshes.reduce((n,e)=>n+e.mesh.geometry.index.count/3*e.mesh.geometry.instanceCount,0),chunks:q.chunks.size,cachedTiles:q.tiles.size,bufferBytes:q.meshes.reduce((s,e)=>s+Object.values(e.mesh.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(e.mesh.geometry.index?.array.byteLength??0),0),stats:{...q.stats},engineQueries:0,castShadow:false});
 if(fern){try{const {applyHollyFern}=await import('./mangrove-fern-material.js');await applyHollyFern(world,q);
  // Chunks can arrive or be replaced while the fern textures load. Reconcile
  // against the live renderer snapshot before handing this layer to the world.
  for(const key of q.chunks.keys())if(!world.chunks.has(key))q.release(key);
  for(const key of world.chunks.keys()){const [cx,cz]=key.split(',').map(Number);chunk(cx,cz);}
 }catch(e){q.dispose();throw e;}}
 return q;
}
