import * as THREE from 'three';
// Cyan-only screen glow: one framebuffer copy and three fixed draws, independent
// of source count. Half-resolution filtering preserves the original world draw.
export class AwakeningGlow {
  constructor(){
    this.size=new THREE.Vector2();this.scene=new THREE.Scene();this.camera=new THREE.Camera();
    this.geometry=new THREE.PlaneGeometry(2,2);
    const vertexShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
    this.blur=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{uMap:{value:null},uStep:{value:new THREE.Vector2()},uExtract:{value:0}},vertexShader,
      fragmentShader:`uniform sampler2D uMap;uniform vec2 uStep;uniform float uExtract;varying vec2 vUv;
      vec3 lightAt(vec2 uv){vec3 c=texture2D(uMap,uv).rgb;if(uExtract>.5){float m=smoothstep(.02,.35,min(c.g,c.b)-c.r);return vec3(.015,1.,.68)*m*max(c.g,c.b);}return c;}
      void main(){vec3 c=lightAt(vUv)*.227027;c+=(lightAt(vUv+uStep*1.384615)+lightAt(vUv-uStep*1.384615))*.316216;c+=(lightAt(vUv+uStep*3.230769)+lightAt(vUv-uStep*3.230769))*.070270;gl_FragColor=vec4(c,1.);}`});
    this.compose=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,transparent:true,blending:THREE.AdditiveBlending,uniforms:{uMap:{value:null}},vertexShader,
      fragmentShader:'uniform sampler2D uMap;varying vec2 vUv;void main(){vec3 c=texture2D(uMap,vUv).rgb;gl_FragColor=vec4(c*1.5,1.);}'});
    this.quad=new THREE.Mesh(this.geometry,this.blur);this.quad.frustumCulled=false;this.scene.add(this.quad);this.stats={frames:0,draws:0};
  }
  apply(renderer){
    const previous=renderer.getRenderTarget();if(previous)return; // Native offscreen owners retain their output contract.
    renderer.getDrawingBufferSize(this.size);const width=this.size.x,height=this.size.y;
    if(this.capture?.image.width!==width||this.capture?.image.height!==height){
      this.releaseTargets();this.capture=new THREE.FramebufferTexture(width,height);this.capture.minFilter=this.capture.magFilter=THREE.LinearFilter;
      const options={depthBuffer:false,stencilBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter};
      this.a=new THREE.WebGLRenderTarget(Math.max(1,width>>1),Math.max(1,height>>1),options);this.b=this.a.clone();
    }
    renderer.copyFramebufferToTexture(this.capture);const auto=renderer.autoClear,reset=renderer.info.autoReset;renderer.info.autoReset=false;
    try{
      renderer.autoClear=true;this.quad.material=this.blur;this.blur.uniforms.uMap.value=this.capture;this.blur.uniforms.uExtract.value=1;this.blur.uniforms.uStep.value.set(3./width,0);
      renderer.setRenderTarget(this.a);renderer.render(this.scene,this.camera);
      this.blur.uniforms.uMap.value=this.a.texture;this.blur.uniforms.uExtract.value=0;this.blur.uniforms.uStep.value.set(0,3./height);
      renderer.setRenderTarget(this.b);renderer.render(this.scene,this.camera);
      renderer.setRenderTarget(previous);renderer.autoClear=false;this.quad.material=this.compose;this.compose.uniforms.uMap.value=this.b.texture;renderer.render(this.scene,this.camera);
      this.stats.frames++;this.stats.draws+=3;
    }finally{renderer.setRenderTarget(previous);renderer.autoClear=auto;renderer.info.autoReset=reset;}
  }
  releaseTargets(){this.capture?.dispose();this.a?.dispose();this.b?.dispose();this.capture=null;}
  dispose(){this.releaseTargets();this.geometry.dispose();this.blur.dispose();this.compose.dispose();}
}
