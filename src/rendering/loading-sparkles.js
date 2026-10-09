import * as THREE from 'three';

// Twenty-four tiny camera-facing accents: one draw, fixed buffers, GPU motion.
// Presentation-only; no world IDs, crop state, physics or additional texture.
export class LoadingSparkles {
 constructor(scene,{count=24}={}){
  const quad=new THREE.PlaneGeometry(1,1),geometry=new THREE.InstancedBufferGeometry();
  geometry.index=quad.index.clone();for(const [key,value] of Object.entries(quad.attributes))geometry.setAttribute(key,value.clone());quad.dispose();
  const seeds=new Float32Array(count);for(let i=0;i<count;i++)seeds[i]=(i+.5)/count;
  geometry.setAttribute('aSeed',new THREE.InstancedBufferAttribute(seeds,1));geometry.instanceCount=count;
  this.uniforms={uTime:{value:0},uNight:{value:0},uMotion:{value:1}};
  this.material=new THREE.ShaderMaterial({uniforms:this.uniforms,transparent:true,depthWrite:false,depthTest:true,toneMapped:false,blending:THREE.AdditiveBlending,
   vertexShader:`attribute float aSeed;uniform float uTime,uMotion;varying vec2 vUv;varying float vPulse;
    void main(){float angle=aSeed*59.67;float phase=uTime*.24*uMotion+aSeed*6.2831853;vec3 centre=vec3(sin(angle)*(1.6+aSeed*1.3),.35+mod(aSeed*3.8+uTime*.11*uMotion,3.5),cos(angle)*(1.2+aSeed*1.6));centre.xz+=vec2(sin(phase),cos(phase*1.2))*.18*uMotion;vec4 eye=modelViewMatrix*vec4(centre,1.);vUv=uv;vPulse=.35+.65*pow(.5+.5*sin(phase*1.7),2.);eye.xy+=position.xy*(.055+.055*aSeed);gl_Position=projectionMatrix*eye;}`,
   fragmentShader:`uniform float uNight;varying vec2 vUv;varying float vPulse;void main(){vec2 p=(vUv-.5)*2.;float r=dot(p,p);float core=exp(-r*12.);float halo=pow(max(0.,1.-r),3.)*.13;float crossShape=exp(-abs(p.x)*55.)*pow(max(0.,1.-abs(p.y)),5.)+exp(-abs(p.y)*55.)*pow(max(0.,1.-abs(p.x)),5.);float a=(core+halo+crossShape*.3)*vPulse*.72;if(a<.006)discard;gl_FragColor=vec4(mix(vec3(1.,.83,.38),vec3(.57,.78,1.),uNight),a);
#include <colorspace_fragment>}`});
  this.geometry=geometry;this.mesh=new THREE.Mesh(geometry,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=20;scene.add(this.mesh);
 }
 update(time,night,reducedMotion){this.uniforms.uTime.value=time;this.uniforms.uNight.value=night;this.uniforms.uMotion.value=reducedMotion?0:1;}
 dispose(){this.mesh.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
