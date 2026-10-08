// Generated adaptation of CULT V3. Exact regional opaque bridge, original UVs.
import * as THREE from 'three';
import {cropSpec} from '../simulation/rules.js';
const ids=['maiz','algodon','girasol','platano','sorgo','mijo','yuca','batata'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const MARKS=[.065,.27,.53,.78,1];
export function createCropBatch(scene,renderer,gltf,bridgeData,MAX_PLANTS=128,{species=ids,shadows=true,deferPreparation=false}={}) {
 const selected=new Set(species.map(id=>ids.indexOf(id)));
 if(!selected.size||selected.has(-1))throw Error('Invalid crop batch species');
 const state={morphSeconds:2},renderOrigin={x:0,z:0};
 let models=[],bridges=[],counts=new Uint32Array(40),bridgeCounts=new Uint32Array(32);
 const dirty=new Map();
 // A bounded sample per species and one synchronous pose avoid copying plant
 // state and allocating identical botanical recipes for mature/paused cohorts.
 const stageSamples=Array(8),renderPlant={};
 // Consumed synchronously by writeValues; no per-plant upload tuple allocation.
 const instanceValues=[0,0,0,0];
 // Presentation-only metadata; logical entities are never changed. Height caching
 // is opt-in for an immutable terrain identity, not arbitrary ground callbacks.
 let entitySamples=new WeakMap(),terrainIdentity=null;
 const uniforms={clock:{value:0},wind:{value:1}},tmpObj=new THREE.Object3D();
 const cycleDuration=crop=>cropSpec(ids[crop]).growth_seconds;
const GROWTH_DECL=`attribute vec4 iGrowth; uniform float uGround; uniform float uHeight; uniform float uClock; uniform float uWind;`;
const GROWTH_POSITION=`
 float plantMask=smoothstep(uGround,uGround+0.12,position.y);
 float above=max(0.0,position.y-uGround);
 float sy=mix(1.0,iGrowth.x,plantMask);
 float sr=mix(1.0,iGrowth.y,plantMask);
 transformed.y=position.y+above*(sy-1.0);
 transformed.xz=position.xz*sr;
 float leafMask=plantMask*smoothstep(0.035,0.22,length(position.xz));
 float folded=1.0-iGrowth.z;
 transformed.xz*=1.0-leafMask*folded*0.16;
 transformed.y+=leafMask*folded*(0.10+above*0.12);
 float h=clamp(above/max(0.15,uHeight-uGround),0.0,1.0);
 float breeze=(sin(uClock*1.55+iGrowth.w)*0.017+sin(uClock*2.71+iGrowth.w*1.7)*0.009)*pow(h,1.7)*uWind*plantMask;
 transformed.x+=breeze; transformed.z+=breeze*0.47;
`;
function patchGrowth(material,meta,depth=false){
 if(depth)material.userData.worldDepthCompatible=true;
 if(depth)material.userData.nativeShadowInputs=()=>[.10,meta.height,uniforms.clock.value,uniforms.wind.value];
 material.onBeforeCompile=shader=>{
  shader.uniforms.uGround={value:.10};shader.uniforms.uHeight={value:meta.height};shader.uniforms.uClock=uniforms.clock;shader.uniforms.uWind=uniforms.wind;
  shader.vertexShader=GROWTH_DECL+'\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+GROWTH_POSITION);
  if(!depth)shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>\nfloat nm=smoothstep(uGround,uGround+0.12,position.y);objectNormal=normalize(objectNormal/vec3(mix(1.0,iGrowth.y,nm),mix(1.0,iGrowth.x,nm),mix(1.0,iGrowth.y,nm)));`);
  material.userData.shader=shader;
 };
 material.customProgramCacheKey=()=>depth?'bioma-growth-depth-v3-opaque':'bioma-growth-pbr-v3-opaque';
}
function* prepareModels(gltf){
 const meshes=[];gltf.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
 for(const o of meshes){
  const meta=o.userData;if(!Number.isInteger(meta.cropIndex)||!meta.stage)throw new Error('Falta la clasificación de un modelo');
  if(!selected.has(meta.cropIndex))continue;
  const i=meta.cropIndex*5+meta.stage-1,geo=o.geometry.clone();
  geo.setAttribute('iGrowth',new THREE.InstancedBufferAttribute(new Float32Array(MAX_PLANTS*4),4).setUsage(THREE.DynamicDrawUsage));
  const material=o.material.clone();material.metalness=0;material.roughness=.91;material.metalnessMap=null;material.roughnessMap=null;if(material.normalScale)material.normalScale.set(.48,.48);material.side=THREE.DoubleSide;material.shadowSide=THREE.DoubleSide;
  if(material.map)material.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  patchGrowth(material,meta);const mesh=new THREE.InstancedMesh(geo,material,MAX_PLANTS);mesh.name=o.name;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;mesh.castShadow=shadows;mesh.receiveShadow=shadows;mesh.frustumCulled=false;
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});patchGrowth(depth,meta,true);mesh.customDepthMaterial=depth;
  models[i]={mesh,meta,geo,material,growthAttr:geo.getAttribute('iGrowth')};scene.add(mesh);yield;
 }
 if(models.filter(Boolean).length!==selected.size*5)throw new Error('Missing requested crop stages');
}
/* Short-lived, opaque dual-topology bridge. Original A and B are NEVER modified.
 * Every triangle gets one regional driver. At the A endpoint, all B leaf faces
 * have zero area; at B the inverse holds. The ground is exchanged below the soil
 * plane. This gives exact visible endpoints without texture alpha or coverage noise.
 * Region labels / pairings were precomputed from the original geometry. They are
 * geometric approximations, not a manually authored botanical rig.
 */
const BRIDGE_DECL=`
attribute vec3 aRoot;
attribute vec3 aPeerRoot;
attribute vec4 aSpin;
attribute vec4 aPart;
attribute vec4 iBridge;
uniform vec2 uHeights;
uniform vec2 uRadii;
uniform float uClock;
uniform float uWind;
float bridgeEase(float x){x=clamp(x,0.0,1.0);return x*x*x*(x*(x*6.0-15.0)+10.0);}
vec4 bridgeQuat(vec4 q,float t){
 float a=acos(clamp(q.w,-1.0,1.0));float sn=sin(a);
 if(abs(sn)<0.0001)return vec4(0.0,0.0,0.0,1.0);
 return vec4(q.xyz*(sin(t*a)/sn),cos(t*a));
}
vec3 bridgeRotate(vec3 v,vec4 q){return v+2.0*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
vec3 bridgeBase(vec3 p,float role){
 float ownH=mix(uHeights.x,uHeights.y,role),ownR=mix(uRadii.x,uRadii.y,role);
 float H=mix(uHeights.x,uHeights.y,iBridge.y),R=mix(uRadii.x,uRadii.y,iBridge.y);
 float sy=(H-0.1)/max(0.12,ownH-0.1),sr=clamp(R/max(0.08,ownR),0.25,2.8);
 float pm=smoothstep(0.1,0.22,p.y),above=max(0.0,p.y-0.1);
 vec3 v=p;v.y+=above*(mix(1.0,sy,pm)-1.0);v.xz*=mix(1.0,sr,pm);
 float lm=pm*smoothstep(0.035,0.22,length(p.xz));float folded=role*(1.0-mix(0.70,1.0,iBridge.y));
 v.xz*=1.0-lm*folded*0.16;v.y+=lm*folded*(0.10+above*0.12);
 float h=clamp(above/max(0.15,ownH-0.1),0.0,1.0);
 float breeze=(sin(uClock*1.55+iBridge.z)*0.017+sin(uClock*2.71+iBridge.z*1.7)*0.009)*pow(h,1.7)*uWind*pm;
 v.x+=breeze;v.z+=breeze*0.47;return v;
}
vec3 bridgeBaseNormal(vec3 p,vec3 n,float role){
 float ownH=mix(uHeights.x,uHeights.y,role),ownR=mix(uRadii.x,uRadii.y,role);
 float H=mix(uHeights.x,uHeights.y,iBridge.y),R=mix(uRadii.x,uRadii.y,iBridge.y);
 float sy=(H-0.1)/max(0.12,ownH-0.1),sr=clamp(R/max(0.08,ownR),0.25,2.8);
 float pm=smoothstep(0.1,0.22,p.y);return normalize(n/vec3(mix(1.0,sr,pm),mix(1.0,sy,pm),mix(1.0,sr,pm)));
}
float bridgePartTime(){
 // A tiny phase offset staggers organs, but is zero at both endpoints.
 float t=clamp(iBridge.x,0.0,1.0);t+=aPart.z*sin(3.14159265359*t)*0.055;
 return bridgeEase(t);
}
vec3 bridgePosition(vec3 p){
 float role=aPart.x,kind=aPart.y,t=bridgePartTime();
 vec3 v=bridgeBase(p,role);
 if(kind<0.5){
  // Both bases keep their shape; the hidden one remains inside the soil slab.
  float away=mix(t,1.0-t,role);v.y-=0.75*pow(away,6.0);return v;
 }
 float weight=mix(1.0-t,t,role),scale=sqrt(max(0.0,weight));
 vec3 root=bridgeBase(aRoot,role),peer=bridgeBase(aPeerRoot,1.0-role);
 float away=mix(t,1.0-t,role);vec3 pivot=mix(root,peer,away);
 if(kind<1.5){
  // Collapse the core in radius only: never squash the stem vertically.
  v.xz=mix(pivot.xz,v.xz,scale);return v;
 }
 vec4 q=bridgeQuat(aSpin,away);
 return pivot+bridgeRotate(v-root,q)*scale;
}
vec3 bridgeNormal(vec3 p,vec3 n){
 float role=aPart.x,kind=aPart.y,t=bridgePartTime();vec3 v=bridgeBaseNormal(p,n,role);
 if(kind<0.5)return v;
 float away=mix(t,1.0-t,role);
 if(kind<1.5){float s=max(0.001,sqrt(max(0.0,1.0-away)));return normalize(v/vec3(s,1.0,s));}
 return normalize(bridgeRotate(v,bridgeQuat(aSpin,away)));
}
`;
function patchBridge(material,a,b,depth=false){
 if(depth)material.userData.worldDepthCompatible=true;
 if(depth)material.userData.nativeShadowInputs=()=>[a.height,b.height,a.foliageRadius,b.foliageRadius,uniforms.clock.value,uniforms.wind.value];
 material.onBeforeCompile=shader=>{
  shader.uniforms.uHeights={value:new THREE.Vector2(a.height,b.height)};
  shader.uniforms.uRadii={value:new THREE.Vector2(a.foliageRadius,b.foliageRadius)};
  shader.uniforms.uClock=uniforms.clock;shader.uniforms.uWind=uniforms.wind;
  shader.vertexShader=BRIDGE_DECL+'\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=bridgePosition(position);');
  if(!depth)shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=bridgeNormal(position,objectNormal);');
  material.userData.shader=shader;
 };
 material.customProgramCacheKey=()=>depth?'bioma-local-bridge-depth-v3':'bioma-local-bridge-pbr-v3';
}
function* prepareBridges(data){
 if(!data||data.models?.length!==40||data.pairs?.length!==32)throw new Error('Datos de transición incompletos');
 const v1=new THREE.Vector3(),v2=new THREE.Vector3(),q=new THREE.Quaternion();
 for(const pair of data.pairs){
  if(!selected.has(Math.floor(pair.a/5)))continue;
  const A=models[pair.a],B=models[pair.b];
  if(!A||!B)throw new Error('Correspondencia de transición no válida');
  const total=A.geo.index.count+B.geo.index.count;
  const pos=new Float32Array(total*3),norm=new Float32Array(total*3),uv=new Float32Array(total*2);
  const roots=new Float32Array(total*3),peers=new Float32Array(total*3),spins=new Float32Array(total*4),parts=new Float32Array(total*4);
  let cursor=0;
  for(let role=0;role<2;role++){
   const own=role?B:A,other=role?A:B,rd=data.models[role?pair.b:pair.a],pd=data.models[role?pair.a:pair.b],mapping=role?pair.b2a:pair.a2b;
   const pg=own.geo.getAttribute('position'),ng=own.geo.getAttribute('normal'),ug=own.geo.getAttribute('uv'),ix=own.geo.index.array;
   if(rd.vertices!==pg.count||rd.faces*3!==ix.length||rd.faceLabels.length!==rd.faces)throw new Error('La transición no coincide con la malla original');
   const drivers=rd.regions.map((r,k)=>{
    const match=mapping[k],pr=match>=0?pd.regions[match]:null;
    let peer,spin=[0,0,0,1];
    if(pr){
     peer=pr.root;
     if(k>=2){
      v1.fromArray(r.direction).normalize();v2.fromArray(pr.direction).normalize();q.setFromUnitVectors(v1,v2).normalize();
      if(q.w<0)q.set(-q.x,-q.y,-q.z,-q.w);spin=q.toArray();
     }
    }else{
     // Unmatched organs emerge from / retire toward an attachment on the other
     // plant, instead of nearest-vertex interpolation across unrelated leaves.
     const yh=clamp((r.root[1]-.10)/Math.max(.2,own.meta.height-.10),.03,.94);
     peer=[r.root[0]*.16,.10+yh*(other.meta.height-.10),r.root[2]*.16];
    }
    // Phase depends on location, so nearby matched regions evolve together.
    const phase=k<2?0:Math.sin((r.root[1]/Math.max(.2,own.meta.height))*5.0)*.65;
    return{root:r.root,peer,spin,kind:k<2?k:2,phase};
   });
   for(let face=0;face<rd.faces;face++){
    if(face%512===0)yield;
    const d=drivers[rd.faceLabels[face]];if(!d)throw new Error('Región de transición desconocida');
    for(let j=0;j<3;j++,cursor++){
     const vi=ix[face*3+j];pos.set([pg.getX(vi),pg.getY(vi),pg.getZ(vi)],cursor*3);
     norm.set([ng.getX(vi),ng.getY(vi),ng.getZ(vi)],cursor*3);uv.set([ug.getX(vi),ug.getY(vi)],cursor*2);
     roots.set(d.root,cursor*3);peers.set(d.peer,cursor*3);spins.set(d.spin,cursor*4);parts.set([role,d.kind,d.phase,0],cursor*4);
    }
   }
  }
  const geo=new THREE.BufferGeometry();
  for(const [name,array,size] of [['position',pos,3],['normal',norm,3],['uv',uv,2],['aRoot',roots,3],['aPeerRoot',peers,3],['aSpin',spins,4],['aPart',parts,4]])geo.setAttribute(name,new THREE.BufferAttribute(array,size));
  const attr=new THREE.InstancedBufferAttribute(new Float32Array(MAX_PLANTS*4),4).setUsage(THREE.DynamicDrawUsage);geo.setAttribute('iBridge',attr);
  geo.computeBoundingSphere();
  const material=A.material.clone();material.transparent=false;material.opacity=1;material.depthWrite=true;material.alphaTest=0;patchBridge(material,A.meta,B.meta);
  const mesh=new THREE.InstancedMesh(geo,material,MAX_PLANTS);mesh.name=`puente_${A.meta.crop}_${A.meta.stage}_${B.meta.stage}`;
  mesh.count=0;mesh.visible=false;mesh.castShadow=shadows;mesh.receiveShadow=shadows;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});patchBridge(depth,A.meta,B.meta,true);mesh.customDepthMaterial=depth;
  const index=A.meta.cropIndex*4+A.meta.stage-1;bridges[index]={mesh,geo,attr,a:pair.a,b:pair.b};scene.add(mesh);yield;
 }
}
function transitionWindow(crop,stage){
 const intervalSeconds=(MARKS[stage+1]-MARKS[stage])*cycleDuration(crop);
 // The bridge is always INSIDE the former .64–.98 coverage transition.
 // A fixed simulated duration keeps long crop cycles free from long deformations.
 const width=state.morphSeconds>0?Math.min(.34,state.morphSeconds/intervalSeconds):.34;
 return{start:.81-width*.5,end:.81+width*.5,seconds:width*intervalSeconds};
}
// Compare in GPU precision. Repeated Float64-to-Float32 conversion must not
// dirty a stable plant, and pending ranges survive multiple updates before draw.
function writeValues(attribute,offset,values){
 let first=-1,last=-1;
 for(let i=0;i<values.length;i++){
  const value=Math.fround(values[i]);if(attribute.array[offset+i]===value)continue;
  attribute.array[offset+i]=value;if(first<0)first=offset+i;last=offset+i;
 }
 if(first<0)return;
 const range=dirty.get(attribute);if(range){range[0]=Math.min(range[0],first);range[1]=Math.max(range[1],last);}else dirty.set(attribute,[first,last]);
}
function writePose(item,slot,plant){
 const x=plant.x-renderOrigin.x,y=plant.y||0,z=plant.z-renderOrigin.z,rotation=plant.rotation||0,old=item.poses?.[slot];
 if(old&&old[0]===x&&old[1]===y&&old[2]===z&&old[3]===rotation)return;
 (item.poses??=[])[slot]=[x,y,z,rotation];
 tmpObj.position.set(x,y,z);tmpObj.rotation.set(0,rotation,0);tmpObj.scale.setScalar(1);tmpObj.updateMatrix();
 writeValues(item.mesh.instanceMatrix,slot*16,tmpObj.matrix.elements);
}
function writeBridge(index,plant,part){
 const b=bridges[index],slot=bridgeCounts[index]++;if(slot>=MAX_PLANTS)return;
 writePose(b,slot,plant);
 instanceValues[0]=part.t;instanceValues[1]=part.e;instanceValues[2]=plant.seed||0;instanceValues[3]=0;
 writeValues(b.attr,slot*4,instanceValues);
}

function stageSample(crop,growth){
 const offset=crop*5,first=models[offset].meta;
 if(growth<MARKS[0]){const t=smooth(growth/MARKS[0]),sy=mix(.045,1,t),sr=mix(.30,1,t);return{height:.10+(first.height-.10)*sy,stage:0,phase:'original',items:[{index:offset,sy,sr,open:mix(.45,1,t)}]};}
 if(growth>=1)return{height:models[offset+4].meta.height,stage:4,phase:'original',items:[{index:offset+4,sy:1,sr:1,open:1}]};
 let a=0;while(a<3&&growth>=MARKS[a+1])a++;
 const local=clamp((growth-MARKS[a])/(MARKS[a+1]-MARKS[a]),0,1),e=smooth(local);
 const am=models[offset+a].meta,bm=models[offset+a+1].meta;
 const height=mix(am.height,bm.height,e),radius=mix(am.foliageRadius,bm.foliageRadius,e),w=transitionWindow(crop,a);
 if(local>w.start&&local<w.end){
  const t=clamp((local-w.start)/(w.end-w.start),0,1);
  return{height,stage:t>=.5?a+1:a,phase:'morph',from:a,to:a+1,t,seconds:w.seconds,items:[],bridge:{index:crop*4+a,t,e}};
 }
 const incoming=local>=w.end,meta=incoming?bm:am;
 return{height,stage:a+(incoming?1:0),phase:'original',items:[{index:offset+a+(incoming?1:0),sy:(height-.1)/Math.max(.12,meta.height-.1),sr:clamp(radius/Math.max(.08,meta.foliageRadius),.25,2.8),open:incoming?mix(.70,1,e):1}]};
}
function writeInstance(modelIndex,plant,part){
 const item=models[modelIndex],slot=counts[modelIndex]++;if(slot>=MAX_PLANTS)return;
 writePose(item,slot,plant);
 instanceValues[0]=part.sy;instanceValues[1]=part.sr;instanceValues[2]=part.open;instanceValues[3]=plant.seed||0;
 writeValues(item.growthAttr,slot*4,instanceValues);
}

 function* preparation(){yield* prepareModels(gltf);yield* prepareBridges(bridgeData);}
 const prepare=preparation();
 if(!deferPreparation)for(const _ of prepare){}
 return {
  capacity:MAX_PLANTS,
  preparation:prepare,
  update(plants,clock,ground,origin={x:0,z:0},groundKey=null) {
   if(groundKey!==terrainIdentity){entitySamples=new WeakMap();terrainIdentity=groundKey;}
   renderOrigin.x=origin.x;renderOrigin.z=origin.z;for(const model of [...models,...bridges].filter(Boolean))model.mesh.position.set(origin.x,0,origin.z);
   uniforms.clock.value=clock;counts.fill(0);bridgeCounts.fill(0);dirty.clear();
   for(const entity of plants){
    let entry=entitySamples.get(entity);
    if(!entry||entry.id!==entity.id||entry.species!==entity.species){
     entry={id:entity.id,species:entity.species,crop:ids.indexOf(entity.species),duration:cropSpec(entity.species).growth_seconds,seed:Number(entity.id.replace(/\D/g,''))||0};entitySamples.set(entity,entry);
    }
    if(groundKey===null||entry.x!==entity.x||entry.z!==entity.z||!entry.hasHeight){
     entry.y=ground(entity.x,entity.z);entry.x=entity.x;entry.z=entity.z;entry.hasHeight=true;
    }
    const p=renderPlant;p.x=entity.x;p.z=entity.z;p.rotation=entity.rotation;p.crop=entry.crop;p.growth=entity.growth/entry.duration;p.y=entry.y;p.seed=entry.seed;
    const cached=stageSamples[p.crop];
    const sample=cached?.growth===p.growth?cached.sample:stageSample(p.crop,p.growth);
    if(cached?.growth!==p.growth)stageSamples[p.crop]={growth:p.growth,sample};
    for(const part of sample.items)writeInstance(part.index,p,part);
    if(sample.bridge)writeBridge(sample.bridge.index,p,sample.bridge);
   }
   for(let i=0;i<models.length;i++){const m=models[i];if(!m)continue;m.mesh.count=Math.min(MAX_PLANTS,counts[i]);m.mesh.visible=m.mesh.count>0;}
   for(let i=0;i<bridges.length;i++){const b=bridges[i];if(!b)continue;b.mesh.count=Math.min(MAX_PLANTS,bridgeCounts[i]);b.mesh.visible=b.mesh.count>0;}
   for(const [attribute,[first,last]] of dirty){attribute.addUpdateRange(first,last-first+1);attribute.needsUpdate=true;}
  },
  dispose(){entitySamples=new WeakMap();terrainIdentity=null;for(const model of [...models,...bridges].filter(Boolean)){scene.remove(model.mesh);model.mesh.dispose();model.geo.dispose();model.mesh.material.dispose();model.mesh.customDepthMaterial?.dispose();}},
  sample:(id,growth)=>stageSample(ids.indexOf(id),growth/cropSpec(id).growth_seconds)
 };
}

// Real cooperative construction: the iterator yields between model creation and
// bounded batches of bridge faces. The synchronous API uses identical recipes.
export async function createCropBatchAsync(scene,renderer,gltf,bridgeData,capacity=128,{nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),cancelled=()=>false,budgetMs=4,now=()=>performance.now(),...options}={}){
 const batch=createCropBatch(scene,renderer,gltf,bridgeData,capacity,{...options,deferPreparation:true});
 try{let slice=now();for(;;){if(cancelled())throw Error('Crop preparation cancelled');const step=batch.preparation.next();if(step.done)return batch;if(now()-slice>=budgetMs){await nextFrame();slice=now();}}}
 catch(error){batch.dispose();throw error;}
}
