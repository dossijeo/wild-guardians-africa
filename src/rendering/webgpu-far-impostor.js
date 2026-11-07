import * as THREE from 'three';
import {MeshBasicNodeMaterial} from 'three/webgpu';
import {abs,atan,attribute,cameraPosition,clamp,cos,float,floor,fract,length,materialReference,max,mix,modelWorldMatrix,screenCoordinate,select,sin,smoothstep,texture,uniform,uv,varying,vec2,vec3,vec4} from 'three/tsl';
import {impostorHullShape} from '../../tools/experiments/impostor-hull.js';

function farCoverage(start,end){const base=attribute('wgFarBase','vec3'),radius=attribute('wgFarRadius','float'),enabled=attribute('wgFarReady','float'),worldBase=modelWorldMatrix.mul(vec4(base,1)).xyz;return varying(smoothstep(start,end,max(length(cameraPosition.xz.sub(worldBase.xz)).sub(radius),0)).mul(enabled));}
function farThreshold(){const pixel=floor(screenCoordinate.xy).mod(8);let ordered=float(0);for(let bit=0;bit<3;bit++){const x=floor(pixel.x.div(2**bit)).mod(2),y=floor(pixel.y.div(2**bit)).mod(2);ordered=ordered.mul(4).add(abs(x.sub(y)).mul(2)).add(y);}return ordered.add(.5).div(64);}

// Configure a *candidate* 3D material, not an already visible material. Its
// instance geometry must carry the same wgFarBase/wgFarReady data as the far
// batch. Both batches must be admitted and swapped under one world revision.
export function configureWebGpuFarModelCoverage(material,{start=60,end=90}={}){
 if(!material?.isNodeMaterial||!Number.isFinite(material.alphaTest)||material.alphaTest<=0||!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start)throw TypeError('Invalid far model coverage');
 const original=material.opacityNode??materialReference('opacity','float'),visible=farThreshold().lessThan(float(1).sub(farCoverage(start,end)));
 material.opacityNode=original.mul(select(visible,float(1),float(0)));return material;
}

// The far atlas contains premultiplied linear colour encoded as sRGB: blend
// in linear space, then unpremultiply exactly once before the opaque draw.
// The owner must coordinate the complementary 3D coverage before publishing.
export function createWebGpuFarImpostor({metadata,day,night,trees,radii=null,start=60,end=90}={}){
 if(!metadata||metadata.views!==8||metadata.rotationViews!==8||metadata.viewResolution!==128||metadata.atlasWidth!==1024||metadata.atlasHeight!==1024||metadata.prelitAlphaEncoding!=='srgb-encoded-linear-premultiplied'||![metadata.impostorWidth,metadata.impostorHeight,metadata.baseV,start,end].every(Number.isFinite)||metadata.impostorWidth<=0||metadata.impostorHeight<=0||start<0||end<=start||!day?.isTexture||!night?.isTexture||!Array.isArray(trees)||trees.some(t=>typeof t?.id!=='string'||!t.id||![t.x,t.y,t.z,t.yaw,t.sx??t.scale,t.sy??t.scale,t.sz??t.scale].every(Number.isFinite)||Math.min(t.sx??t.scale,t.sy??t.scale,t.sz??t.scale)<=0)||new Set(trees.map(t=>t.id)).size!==trees.length||trees.some(t=>!Number.isFinite(Math.fround(metadata.impostorWidth*.5*Math.max(t.sx??t.scale,t.sz??t.scale))))||radii!==null&&(!Array.isArray(radii)||radii.length!==trees.length||radii.some((radius,i)=>!Number.isFinite(radius)||radius<Math.fround(metadata.impostorWidth*.5*Math.max(trees[i].sx??trees[i].scale,trees[i].sz??trees[i].scale)))))throw TypeError('Invalid WebGPU far impostor');
 for(const atlas of [day,night])if(atlas.colorSpace!==THREE.SRGBColorSpace||atlas.premultiplyAlpha){atlas.colorSpace=THREE.SRGBColorSpace;atlas.premultiplyAlpha=false;atlas.needsUpdate=true;}
 const hull=metadata.impostorHull?impostorHullShape(metadata.impostorHull).shape:new THREE.PlaneGeometry(1,1),geometry=new THREE.InstancedBufferGeometry();
 geometry.index=hull.index;for(const [name,value] of Object.entries(hull.attributes))geometry.setAttribute(name,value);geometry.setDrawRange(hull.drawRange.start,hull.drawRange.count);geometry.instanceCount=trees.length;
 const bases=new Float32Array(trees.length*3),scales=new Float32Array(trees.length*3),yaws=new Float32Array(trees.length),farRadii=new Float32Array(trees.length),ready=new Float32Array(trees.length).fill(1),ids=new Map();
 for(let i=0;i<trees.length;i++){const t=trees[i];ids.set(t.id,i);bases.set([t.x,t.y,t.z],i*3);scales.set([t.sx??t.scale,t.sy??t.scale,t.sz??t.scale],i*3);yaws[i]=t.yaw;farRadii[i]=radii?.[i]??metadata.impostorWidth*.5*Math.max(t.sx??t.scale,t.sz??t.scale);}
 geometry.setAttribute('wgFarBase',new THREE.InstancedBufferAttribute(bases,3));geometry.setAttribute('wgFarRadius',new THREE.InstancedBufferAttribute(farRadii,1));geometry.setAttribute('wgFarScale',new THREE.InstancedBufferAttribute(scales,3));geometry.setAttribute('wgFarYaw',new THREE.InstancedBufferAttribute(yaws,1));geometry.setAttribute('wgFarReady',new THREE.InstancedBufferAttribute(ready,1));
 const phase=uniform(0),base=attribute('wgFarBase','vec3'),scale=attribute('wgFarScale','vec3'),yaw=attribute('wgFarYaw','float'),worldBase=modelWorldMatrix.mul(vec4(base,1)).xyz,delta=cameraPosition.xz.sub(worldBase.xz),distance=length(delta),direction=select(distance.greaterThan(.0001),delta.div(max(distance,.0001)),vec2(0,1)),right=vec3(direction.y,0,direction.x.negate()),relative=atan(direction.x,direction.y).sub(yaw),projected=vec2(cos(relative).mul(scale.x),sin(relative).mul(scale.z)),width=length(projected),cell=uv(),local=base.add(right.mul(cell.x.sub(.5)).mul(metadata.impostorWidth).mul(width)).add(vec3(0,cell.y.sub(metadata.baseV).mul(metadata.impostorHeight).mul(scale.y),0));
 const angle=atan(projected.y,projected.x).add(2*Math.PI).mod(2*Math.PI),view=varying(angle.mul(8/(2*Math.PI))),rotation=varying(yaw.add(2*Math.PI).mod(2*Math.PI).mul(8/(2*Math.PI))),coverage=farCoverage(start,end);
 const coordinate=clamp(cell,vec2(.5/128),vec2(127.5/128));
 const sample=(atlas,column,row)=>texture(atlas,vec2(column.mod(8).add(coordinate.x).div(8),float(7).sub(row.mod(8)).add(coordinate.y).div(8)));
 const at=(atlas,row)=>mix(sample(atlas,floor(view),row),sample(atlas,floor(view).add(1),row),fract(view));
 const colorFor=atlas=>mix(at(atlas,floor(rotation)),at(atlas,floor(rotation).add(1)),fract(rotation));
 const color=mix(colorFor(day),colorFor(night),phase),material=new MeshBasicNodeMaterial({side:THREE.DoubleSide,alphaTest:.35,toneMapped:false});material.positionNode=local;material.colorNode=vec4(color.rgb.div(max(color.a,.0001)),color.a);material.opacityNode=select(farThreshold().greaterThanEqual(float(1).sub(coverage)),float(1),float(0));
 // This dither is only one half of the transition. The owner must publish
 // complementary 3D coverage for the same revision before showing the batch.
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.castShadow=false;mesh.visible=false;let closed=false;
 return {mesh,phase,setNight(value){if(closed||!Number.isFinite(value)||value<0||value>1)throw TypeError('Invalid impostor night');phase.value=value;},setEnabled(id,value){if(closed||typeof value!=='boolean')throw TypeError('Invalid impostor visibility');const i=ids.get(id);if(i===undefined)return false;const attr=geometry.getAttribute('wgFarReady');if(attr.getX(i)===(value?1:0))return false;attr.setX(i,value?1:0);attr.addUpdateRange(i,1);attr.needsUpdate=true;return true;},dispose(){if(closed)return;closed=true;mesh.removeFromParent();geometry.dispose();material.dispose();}};
}
