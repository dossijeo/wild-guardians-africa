import * as THREE from 'three';
import {nativeGroundMaterial} from './render-quality.js';
// Preserve the original four-decimal lookup, with allocation-free keys for the
// integer terrain lattice. String fallback keeps irregular coordinates distinct.
export function mudTerrainKey(x,z){
 const a=Number.isInteger(x)?x:Number(x.toFixed(4)),b=Number.isInteger(z)?z:Number(z.toFixed(4));
 if(!(a===0&&x<0)&&!(b===0&&z<0)&&Number.isInteger(a)&&Number.isInteger(b)&&a>=-32768&&a<32768&&b>=-32768&&b<32768)return (a+32768)+(b+32768)*65536;
 return x.toFixed(4)+','+z.toFixed(4);
}
// One-time visual preparation of existing mud triangles; no world queries or per-frame work.
export function bindMangroveMudEdges(world,group){
 let attributeBytes=0,cacheHits=0,uniqueVertices=0,segmentTests=0;
  const ground=group.children.find(m=>m.userData.ground),mud=group.children.find(m=>m.name==='mangrove-mud-patches');if(!ground||!mud)return;
  const start=performance.now(),gp=ground.geometry.attributes.position,gc=ground.geometry.attributes.color,gn=ground.geometry.attributes.normal,grid=new Map();
  for(let i=0;i<gp.count;i++)grid.set(mudTerrainKey(gp.getX(i),gp.getZ(i)),i);
  const g=mud.geometry,p=g.attributes.position,colors=new Float32Array(p.count*3),normals=new Float32Array(p.count*3),edges=new Float32Array(p.count),origin=group.userData.nativeChunkOrigin,vertexCache=new Map();
  const contours=g.userData.mudOutlines.map(points=>({points,minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minZ:Math.min(...points.map(p=>p[1])),maxZ:Math.max(...points.map(p=>p[1]))}));
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),z=p.getZ(i),ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
   const cacheKey=x+','+z,previous=vertexCache?.get(cacheKey);
   if(previous!==undefined){colors.set(colors.subarray(previous*3,previous*3+3),i*3);normals.set(normals.subarray(previous*3,previous*3+3),i*3);edges[i]=edges[previous];cacheHits++;continue;}
   uniqueVertices++;
   const corners=fx+fz<=1?[[ix,iz,1-fx-fz],[ix+1,iz,fx],[ix,iz+1,fz]]:[[ix+1,iz+1,fx+fz-1],[ix,iz+1,1-fx],[ix+1,iz,1-fz]];
   for(const [cx,cz,w]of corners){if(w<1e-7)continue;const j=grid.get(mudTerrainKey(cx,cz));if(j===undefined)throw Error('Missing terrain interpolation vertex '+cx+','+cz);for(let k=0;k<3;k++){colors[i*3+k]+=gc.getComponent(j,k)*w;normals[i*3+k]+=gn.getComponent(j,k)*w}}
   let dist=Infinity;const wx=x+origin[0],wz=z+origin[1];
   const bounds=c=>Math.hypot(Math.max(c.minX-wx,0,wx-c.maxX),Math.max(c.minZ-wz,0,wz-c.maxZ));
   const scan=c=>{const contour=c.points;for(let j=0;j<contour.length;j++){
    segmentTests++;const a=contour[j],b=contour[(j+1)%contour.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((wx-a[0])*dx+(wz-a[1])*dz)/(dx*dx+dz*dz)));dist=Math.min(dist,Math.hypot(wx-a[0]-t*dx,wz-a[1]-t*dz));
   }};
   {
    let nearest=contours[0],minimum=Infinity;for(const c of contours){const lower=bounds(c);if(lower<minimum){minimum=lower;nearest=c}}
    scan(nearest);for(const c of contours)if(c!==nearest&&bounds(c)<dist)scan(c);
   }edges[i]=dist;vertexCache?.set(cacheKey,i);
  }
  const old=mud.material,normalAttribute=g.attributes.normal;
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));normalAttribute.array.set(normals);normalAttribute.needsUpdate=true;g.setAttribute('qaMudEdge',new THREE.BufferAttribute(edges,1));attributeBytes+=colors.byteLength+normals.byteLength+edges.byteLength;
  const material=nativeGroundMaterial(world.quality);Object.assign(material.userData,ground.material.userData);material.userData.retainBiomeGround?.(material);
  material.userData.mangroveMudTextures={base:old.map,normal:old.normalMap,packed:old.roughnessMap};
  configureMangroveMudMaterial(world,material);mud.material=material;
  old.dispose();
  mud.userData.globalMudBlend={attributeBytes,cacheHits,uniqueVertices,segmentTests,buildMs:performance.now()-start};
}

// Reapply the same edge recipe when the quality profile replaces the ground material.
export function configureMangroveMudMaterial(world,material){
 const textures=material.userData.mangroveMudTextures;
 if(!textures)return;
 world.toon.material(material);
  const compile=material.onBeforeCompile,key=material.customProgramCacheKey;
  material.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);Object.assign(shader.uniforms,{uQAMudBase:{value:textures.base},uQAMudNormal:{value:textures.normal},uQAMudPacked:{value:textures.packed}});
   shader.vertexShader='attribute float qaMudEdge;varying float vQAMudEdge;varying vec2 vQAMudUV;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvQAMudEdge=qaMudEdge;vQAMudUV=uv;');
   shader.fragmentShader='uniform sampler2D uQAMudBase,uQAMudNormal,uQAMudPacked;varying float vQAMudEdge;varying vec2 vQAMudUV;\n'+shader.fragmentShader;
   const anchor='vec3 groundAlbedo=toLinear4(clamp(groundColor,0.,1.));';if(!shader.fragmentShader.includes(anchor))throw Error('Missing ground mix anchor');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,`
     float mudWeight=smoothstep(.05,.85,vQAMudEdge);
     vec3 mudLinear=texture2D(uQAMudBase,vQAMudUV).rgb*vec3(.58,.61,.64);
     vec3 mudBase=sRGBTransferOETF(vec4(mudLinear,1.)).rgb;
     vec3 mudN=texture2D(uQAMudNormal,vQAMudUV).xyz*2.-1.;
     vec3 mudPacked=texture2D(uQAMudPacked,vQAMudUV).rgb;
     vec3 mudUp=${material.isMeshBasicMaterial?'normalize(vToonLowNormal)':'normalize(inverseTransformDirection(normalize(vNormal),viewMatrix))'};
     vec3 mudT=normalize(vec3(1.,0.,0.)-mudUp*mudUp.x),mudB=normalize(cross(mudUp,mudT));
     vec3 mudWorldN=normalize(mudT*mudN.x*.55+mudB*mudN.y*.55+mudUp*max(mudN.z,.1));
     groundColor=mix(groundColor,mudBase,mudWeight);toonN=normalize(mix(toonN,mudWorldN,mudWeight));groundRough=mix(groundRough,max(.30,mudPacked.g*.52),mudWeight);materialAO410=mix(materialAO410,mudPacked.r,mudWeight);
   `+anchor);
  };
  {const previous=material.onBeforeCompile;material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);
   const anchor='#include <opaque_fragment>';if(!shader.fragmentShader.includes(anchor))throw Error('Mud interior output anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,`
    vec3 qaMudAlbedo=mudLinear;
    float qaMudRough=max(.04,mudPacked.g*.52);
    float qaMudLeaf=smoothstep(.018,.13,qaMudAlbedo.g-qaMudAlbedo.r*.87)*smoothstep(.06,.20,qaMudAlbedo.g);
    vec3 qaMudReflection=uNativeEnvEnabled>.5?environment4(reflect(-toonV,mudWorldN),qaMudRough):vec3(0.);
    vec3 qaMudToon=toLinear4(africanToon4(vec3(0.),qaMudAlbedo,mudWorldN,toonV,uLightDir,qaMudReflection,qaMudRough,groundVisibility,qaMudLeaf,0.,0.,max(dot(mudWorldN,toonV),0.),worldPatternPosition(vToonWorld)));
    outgoingLight=mix(outgoingLight,qaMudToon,mudWeight);
   `+anchor);
  };}
  material.customProgramCacheKey=()=>key.call(material)+'|global-mud-moss-full-v1';material.needsUpdate=true;
}
