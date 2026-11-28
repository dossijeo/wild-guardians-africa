import {vfxPassRecipe} from './webgpu-material-graph-catalog.js';
import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { attribute, cameraProjectionMatrix, clamp, cos, float, fract, length, max, mix, modelViewMatrix, positionGeometry, positionLocal, screenSize, sin, smoothstep, uniform, uv, vec3, vec4 } from 'three/tsl';

// Experimental TSL translation of the UI guardian's GLSL vortex. The motes
// use instanced quads because native WebGPU points are restricted to one pixel.
export class GuardianVortexWebGPU extends THREE.Group {
 constructor(){
  super();this.visible=false;
  this.nodes={age:uniform(0),flow:uniform(0),height:uniform(3),floor:uniform(0),tint:uniform(new THREE.Color())};
  const {age,flow,height,floor,tint}=this.nodes,positions=[],uvs=[];
  for(let strand=0;strand<3;strand++)for(let step=0;step<48;step++)for(const [offset,side] of [[0,-1],[1,-1],[1,1],[0,-1],[1,1],[0,1]]){positions.push(strand,(step+offset)/48,side);uvs.push((side+1)/2,(step+offset)/48);}
  this.ribbonGeometry=new THREE.BufferGeometry();this.ribbonGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));this.ribbonGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  const h=positionLocal.y,opening=smoothstep(0,.35,age),ending=smoothstep(1.45,2.2,age),radius=float(1.05).add(sin(h.mul(Math.PI)).mul(.3)).mul(opening.mul(.32).oneMinus()).add(ending.mul(.5)),theta=positionLocal.x.mul(2.094395).add(h.mul(8.5)).sub(flow.mul(5)),width=positionLocal.z.mul(.045).mul(sin(h.mul(Math.PI)));
  const strength=smoothstep(0,.12,age).mul(smoothstep(1.8,2.2,age).oneMinus()).mul(smoothstep(.5,.95,age).mul(.7).oneMinus()),edge=max(0,uv().x.mul(2).sub(1).abs().oneMinus()).pow(.7);
  this.ribbonMaterial=new MeshBasicNodeMaterial(vfxPassRecipe('guardianRibbon').structural.state);
  this.ribbonMaterial.positionNode=vec3(cos(theta).mul(radius.add(width)),floor.add(h.mul(height)),sin(theta).mul(radius.add(width)));
  this.ribbonMaterial.outputNode=vec4(tint.mul(1.5),strength.mul(edge).mul(sin(uv().y.mul(Math.PI))));
  this.ribbons=new THREE.Mesh(this.ribbonGeometry,this.ribbonMaterial);this.ribbons.frustumCulled=false;this.add(this.ribbons);
  const seeds=[];for(let i=0;i<96;i++)seeds.push(i/96,((i*37)%97)/97,((i*53)%101)/101);
  const quad=new THREE.PlaneGeometry(1,1);this.moteGeometry=new THREE.InstancedBufferGeometry().copy(quad);quad.dispose();this.moteGeometry.instanceCount=96;this.moteGeometry.setAttribute('wgSeed',new THREE.InstancedBufferAttribute(new Float32Array(seeds),3));
  const seed=attribute('wgSeed','vec3'),mh=fract(seed.x.add(flow.mul(float(.45).add(seed.z.mul(.2))))),mending=smoothstep(1.4,2.2,age),mradius=mix(1.8,.4,smoothstep(0,.55,age)).mul(float(.4).add(seed.y.mul(.6))).add(mending.mul(seed.z)),angle=seed.y.mul(6.283185).add(flow.mul(4)).add(mh.mul(5));
  const view=modelViewMatrix.mul(vec4(vec3(cos(angle).mul(mradius),floor.add(mh.mul(height)).add(mending.mul(.6)),sin(angle).mul(mradius)),1)),clip=cameraProjectionMatrix.mul(view),size=clamp(float(12).add(seed.z.mul(10)).div(max(1,view.z.negate())).mul(8),1,14),offset=positionGeometry.xy.mul(size).mul(2).div(screenSize).mul(clip.w);
  const alpha=max(0,float(1).sub(length(uv().sub(.5)).mul(2))).pow(2).mul(smoothstep(0,.1,age)).mul(smoothstep(1.8,2.2,age).oneMinus()).mul(sin(mh.mul(Math.PI)));
  this.moteMaterial=new MeshBasicNodeMaterial(vfxPassRecipe('guardianMote').structural.state);this.moteMaterial.vertexNode=vec4(clip.xy.add(offset),clip.z,clip.w);this.moteMaterial.outputNode=vec4(tint.mul(1.6),alpha);
  this.motes=new THREE.Mesh(this.moteGeometry,this.moteMaterial);this.motes.frustumCulled=false;this.add(this.motes);
 }
 update(age,color,height=3,floor=-1.2,continuous=false){this.visible=continuous||age>=0&&age<2.2;this.nodes.flow.value=age;this.nodes.age.value=continuous?.7:age;this.nodes.tint.value.setHex(color);this.nodes.height.value=height;this.nodes.floor.value=floor;}
 dispose(){this.ribbonGeometry.dispose();this.ribbonMaterial.dispose();this.moteGeometry.dispose();this.moteMaterial.dispose();}
}
