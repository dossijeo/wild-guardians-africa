import * as THREE from 'three';
import {nativeGroundMaterial} from '/src/rendering/render-quality.js';
// QA: mix mud and moss in a single opaque surface recipe. No terrain mutation.
export function applyMaterialStudy(world,options={}){
 if(world.state.biome!=='manglares')throw Error('Mangrove only');
 const seen=new WeakSet(),bindings=[];let buildMs=0,attributeBytes=0,cacheHits=0,uniqueVertices=0,segmentTests=0;const builds=[];
 function bind(group){
  if(seen.has(group))return;seen.add(group);
  const ground=group.children.find(m=>m.userData.ground),mud=group.children.find(m=>m.name==='mangrove-mud-patches');if(!ground||!mud)return;
  const start=performance.now(),gp=ground.geometry.attributes.position,gc=ground.geometry.attributes.color,gn=ground.geometry.attributes.normal,grid=new Map();
  for(let i=0;i<gp.count;i++)grid.set(gp.getX(i).toFixed(4)+','+gp.getZ(i).toFixed(4),i);
  const g=mud.geometry,p=g.attributes.position,colors=new Float32Array(p.count*3),normals=new Float32Array(p.count*3),edges=new Float32Array(p.count),origin=group.userData.nativeChunkOrigin,vertexCache=options.cache===false?null:new Map();
  const beforeHits=cacheHits,beforeUnique=uniqueVertices;
  const contours=g.userData.mudOutlines.map(points=>({points,minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minZ:Math.min(...points.map(p=>p[1])),maxZ:Math.max(...points.map(p=>p[1]))}));
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),z=p.getZ(i),ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
   const cacheKey=x+','+z,previous=vertexCache?.get(cacheKey);
   if(previous!==undefined){colors.set(colors.subarray(previous*3,previous*3+3),i*3);normals.set(normals.subarray(previous*3,previous*3+3),i*3);edges[i]=edges[previous];cacheHits++;continue;}
   uniqueVertices++;
   const corners=fx+fz<=1?[[ix,iz,1-fx-fz],[ix+1,iz,fx],[ix,iz+1,fz]]:[[ix+1,iz+1,fx+fz-1],[ix,iz+1,1-fx],[ix+1,iz,1-fz]];
   for(const [cx,cz,w]of corners){if(w<1e-7)continue;const j=grid.get(cx.toFixed(4)+','+cz.toFixed(4));if(j===undefined)throw Error('Missing terrain interpolation vertex '+cx+','+cz);for(let k=0;k<3;k++){colors[i*3+k]+=gc.getComponent(j,k)*w;normals[i*3+k]+=gn.getComponent(j,k)*w}}
   let dist=Infinity;const wx=x+origin[0],wz=z+origin[1];
   const bounds=c=>Math.hypot(Math.max(c.minX-wx,0,wx-c.maxX),Math.max(c.minZ-wz,0,wz-c.maxZ));
   const scan=c=>{const contour=c.points;for(let j=0;j<contour.length;j++){
    segmentTests++;const a=contour[j],b=contour[(j+1)%contour.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((wx-a[0])*dx+(wz-a[1])*dz)/(dx*dx+dz*dz)));dist=Math.min(dist,Math.hypot(wx-a[0]-t*dx,wz-a[1]-t*dz));
   }};
   if(options.cache===false){for(const c of contours)scan(c)}else{
    let nearest=contours[0],minimum=Infinity;for(const c of contours){const lower=bounds(c);if(lower<minimum){minimum=lower;nearest=c}}
    scan(nearest);for(const c of contours)if(c!==nearest&&bounds(c)<dist)scan(c);
   }edges[i]=dist;vertexCache?.set(cacheKey,i);
  }
  const old=mud.material,oldNormal=g.attributes.normal;
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.setAttribute('normal',new THREE.BufferAttribute(normals,3));g.setAttribute('qaMudEdge',new THREE.BufferAttribute(edges,1));attributeBytes+=colors.byteLength+normals.byteLength+edges.byteLength;
  const material=nativeGroundMaterial(world.quality);Object.assign(material.userData,ground.material.userData);material.userData.retainBiomeGround?.(material);world.toon.material(material);
  const compile=material.onBeforeCompile,key=material.customProgramCacheKey;
  material.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);Object.assign(shader.uniforms,{uQAMudBase:{value:old.map},uQAMudNormal:{value:old.normalMap},uQAMudPacked:{value:old.roughnessMap}});
   shader.vertexShader='attribute float qaMudEdge;varying float vQAMudEdge;varying vec2 vQAMudUV;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvQAMudEdge=qaMudEdge;vQAMudUV=uv;');
   shader.fragmentShader='uniform sampler2D uQAMudBase,uQAMudNormal,uQAMudPacked;varying float vQAMudEdge;varying vec2 vQAMudUV;\n'+shader.fragmentShader;
   const anchor='vec3 groundAlbedo=toLinear4(clamp(groundColor,0.,1.));';if(!shader.fragmentShader.includes(anchor))throw Error('Missing ground mix anchor');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,`
     float mudWeight=smoothstep(.05,.85,vQAMudEdge);
     vec3 mudBase=sRGBTransferOETF(vec4(texture2D(uQAMudBase,vQAMudUV).rgb*vec3(.58,.61,.64),1.)).rgb;
     vec3 mudN=texture2D(uQAMudNormal,vQAMudUV).xyz*2.-1.;
     vec3 mudPacked=texture2D(uQAMudPacked,vQAMudUV).rgb;
     vec3 mudUp=normalize(inverseTransformDirection(normalize(vNormal),viewMatrix));
     vec3 mudT=normalize(vec3(1.,0.,0.)-mudUp*mudUp.x),mudB=normalize(cross(mudUp,mudT));
     vec3 mudWorldN=normalize(mudT*mudN.x*.55+mudB*mudN.y*.55+mudUp*max(mudN.z,.1));
     groundColor=mix(groundColor,mudBase,mudWeight);toonN=normalize(mix(toonN,mudWorldN,mudWeight));groundRough=mix(groundRough,max(.30,mudPacked.g*.52),mudWeight);materialAO410=mix(materialAO410,mudPacked.r,mudWeight);
   `+anchor);
  };
  material.customProgramCacheKey=()=>key.call(material)+'|qa-mud-moss-blend-v1';material.needsUpdate=true;mud.material=material;
  const binding={mud,old,material,oldNormal};bindings.push(binding);g.addEventListener('dispose',()=>{const i=bindings.indexOf(binding);if(i>=0){bindings.splice(i,1);old.dispose()}});const ms=performance.now()-start;buildMs+=ms;builds.push({origin:[...origin],vertices:p.count,uniqueVertices:uniqueVertices-beforeUnique,cacheHits:cacheHits-beforeHits,ms});
 }
 for(const group of world.chunks.values())bind(group);
 const terrain=world.terrain;world.terrain=function(...args){const group=terrain.apply(this,args);bind(group);return group};
 const audit=()=>({bound:bindings.length,attributeBytes,buildMs,cache:options.cache!==false,cacheHits,uniqueVertices,segmentTests,builds:[...builds],newTriangles:0,newDrawCalls:0,extraSamplers:3});
 world.qaMudBlend={audit};return audit();
}
