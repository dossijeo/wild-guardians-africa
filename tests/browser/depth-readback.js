// QA only: read the actual depth attachment, packed into RGBA8 for export.
import * as THREE from 'three';
export class DepthReadback {
 constructor(renderer){
  this.renderer=renderer;this.target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false});
  this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  this.material=new THREE.ShaderMaterial({uniforms:{depth:{value:null}},vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform sampler2D depth;'+THREE.ShaderChunk.packing+'void main(){gl_FragColor=packDepthToRGBA(texelFetch(depth,ivec2(gl_FragCoord.xy),0).r);}',depthTest:false,depthWrite:false,toneMapped:false});
  this.geometry=new THREE.PlaneGeometry(2,2);this.scene.add(new THREE.Mesh(this.geometry,this.material));
 }
 read(texture,width,height){
  if(!texture?.isDepthTexture)throw Error('Expected an actual depth attachment');
  const r=this.renderer,previous=r.getRenderTarget(),shadows=r.shadowMap.enabled,autoClear=r.autoClear;
  this.target.setSize(width,height);this.material.uniforms.depth.value=texture;
  const bytes=new Uint8Array(width*height*4);
  try{r.shadowMap.enabled=false;r.autoClear=true;r.setRenderTarget(this.target);r.render(this.scene,this.camera);r.readRenderTargetPixels(this.target,0,0,width,height,bytes);}
  finally{r.setRenderTarget(previous);r.shadowMap.enabled=shadows;r.autoClear=autoClear;}
  return bytes;
 }
 dispose(){this.target.dispose();this.geometry.dispose();this.material.dispose();}
}
