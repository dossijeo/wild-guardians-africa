import * as THREE from 'three';
import {createFarImpostorDepthMaterial} from './far-impostor-depth-material.js';
export function compareImpostorDepth(w){
 const r=w.renderer,meshes=[];w.scene.traverse(o=>{if(o.name==='smooth-far-opaque'&&o.material?.isShaderMaterial)meshes.push({object:o,previous:o.customDepthMaterial,depth:createFarImpostorDepthMaterial(o.material),visible:o.visible});});
 if(!meshes.length)throw Error('No opaque impostors present');
 const size=r.getDrawingBufferSize(new THREE.Vector2()),target=new THREE.WebGLRenderTarget(size.x,size.y,{depthBuffer:false}),scene=new THREE.Scene(),camera=new THREE.Camera();
 const material=new THREE.ShaderMaterial({uniforms:{map:{value:w.destructionPass.smokeDepth.depthTexture}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'#include <packing>\nvarying vec2 vUv;uniform sampler2D map;void main(){gl_FragColor=packDepthToRGBA(texture2D(map,vUv).r);}',depthTest:false,depthWrite:false,toneMapped:false});
 const geometry=new THREE.PlaneGeometry(2,2);scene.add(new THREE.Mesh(geometry,material));const originalTarget=r.getRenderTarget(),rows=[];
 function sample(enabled){for(const m of meshes)m.object.customDepthMaterial=enabled?m.depth:m.previous;w.destructionPass.captureDepth(w.camera,w.scene);const stats={...w.destructionPass.depthCaptureStats};r.setRenderTarget(target);r.render(scene,camera);const bytes=new Uint8Array(size.x*size.y*4);r.readRenderTargetPixels(target,0,0,size.x,size.y,bytes);r.setRenderTarget(originalTarget);return {bytes,stats};}
 try{const a=sample(false),b=sample(true),c=sample(false);let absent;try{for(const m of meshes)m.object.visible=false;absent=sample(false);}finally{for(const m of meshes)m.object.visible=m.visible;}
 let changed=0,repeat=0,max=0,control=0;for(let i=0;i<a.bytes.length;i+=4){let ab=false,ac=false,removed=false;for(let k=0;k<4;k++){const d=Math.abs(a.bytes[i+k]-b.bytes[i+k]);ab ||=d!==0;ac ||=a.bytes[i+k]!==c.bytes[i+k];removed ||=a.bytes[i+k]!==absent.bytes[i+k];max=Math.max(max,d);}changed+=Number(ab);repeat+=Number(ac);control+=Number(removed);}
 if(!control)throw Error('Depth control did not see impostors');return {objects:meshes.length,changedPixels:changed,repeatPixels:repeat,maxByteDifference:max,removedPixels:control,base:a.stats,candidate:b.stats};}
 finally{for(const m of meshes){m.object.customDepthMaterial=m.previous;m.object.visible=m.visible;m.depth.dispose();}r.setRenderTarget(originalTarget);geometry.dispose();material.dispose();target.dispose();}
}
