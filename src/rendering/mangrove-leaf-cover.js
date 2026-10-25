import * as THREE from 'three';
// Blender-authored leaf modules, retaining the approved near/far morph.
export function prepareMangroveLeaves(raw){
 const flatNormals=raw.far.position.map(()=>0);
 for(let leaf=0;leaf<4;leaf++){const n=new THREE.Vector3();for(let v=0;v<4;v++)n.add(new THREE.Vector3().fromArray(raw.far.normal,(leaf*4+v)*3));n.normalize();for(let v=0;v<4;v++)n.toArray(flatNormals,(leaf*4+v)*3);}
 const adapt=(data,refined)=>{const stride=refined?5:4,flatPosition=[...data.position],flatNormal=[],bladeRoot=[],uv=[];
 for(let i=0;i<data.position.length/3;i++){const leaf=Math.floor(i/stride),v=i%stride,k=leaf*stride*3,farLeaf=refined?[0,2,5,7].indexOf(leaf):leaf;
 bladeRoot.push(...data.position.slice(k,k+3));uv.push(v===0?0:(v===4?.45:1),farLeaf>=0?.2:.9);
 flatNormal.push(...(farLeaf>=0?flatNormals.slice(farLeaf*12,farLeaf*12+3):[0,1,0]));
 if(refined&&v===4)for(let axis=0;axis<3;axis++)flatPosition[i*3+axis]=data.position[k+axis]*.55+data.position[k+6+axis]*.45;
 }
 return {...data,flatPosition,flatNormal,bladeRoot,uv};};
 return {refined:adapt(raw.near,true),light:adapt(raw.far,false)};
}
export function mangroveLeafShader(vertex,varied=false){
 return vertex.replace('growth=farFade*extra;', varied?'growth=farFade*extra*smoothstep(.10,.96,coverageData.z)*(1.-smoothstep(.03,.25,coverageData.w))*(.25+.75*coverageData.y);':'growth=farFade*extra*smoothstep(.10,.48,coverageData.z)*(1.-smoothstep(.03,.25,coverageData.w));')
 .replace('(root.xz+pos.xz*lod)*uCoverageScale','(root.xz+mix(localRoot.xz,pos.xz,lod))*uCoverageScale')
 .replace('vec3(1.14,1.09,.97)','vec3(.72,.78,.62)')
 .replace('pigment*=.88+.20*coverageData.y;', 'pigment*=mix(.72,1.08,fract(uv.y*13.7+coverageData.x*3.17));');
}

export function cuppedMangroveLeavesEnabled(search=globalThis.location?.search??''){const q=new URLSearchParams(search);return q.get('visualLab')==='global-lighting'&&q.get('mangroveLeaves')==='cupped';}

export function variedMangroveDistributionEnabled(search=globalThis.location?.search??''){const q=new URLSearchParams(search);return q.get('visualLab')==='global-lighting'&&q.get('mangroveDistribution')==='varied';}
