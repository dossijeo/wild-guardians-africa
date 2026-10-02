import * as THREE from 'three';
import {bytes,json} from './assets.js';
import {SKY_VERTEX,SKY_FRAGMENT,decodeRadiance} from './sky-source.js';

// Exact analytic solution of the lab's exponential fade (rate 2.4), driven
// by the game clock. Pauses and reloads cannot advance this presentation.
export function skyNight(state){
  let amount=state.time>=300?1-Math.exp(-(state.time-300)*2.4):state.day>1?Math.exp(-state.time*2.4):0;
  if(amount<.0001)amount=0;if(1-amount<.0001)amount=1;return amount;
}

export class NativeSky {
  constructor(){
    this.scene=new THREE.Scene();this.textures=[];this.materials=[];
    this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,0,0,0,0,0],3));
    this.uniforms={uForward:{value:new THREE.Vector3()},uRight:{value:new THREE.Vector3()},uUp:{value:new THREE.Vector3()},uViewScale:{value:new THREE.Vector2()},uSkyYaw:{value:0}};
  }
  async load(){
    const catalogue=await json('/content/skies.json');
    const images=await Promise.all(catalogue.panoramas.map(async p=>decodeRadiance(await bytes(p.url))));
    images.forEach((image,i)=>{
      const texture=new THREE.DataTexture(image.pixels,image.width,image.height,THREE.RGBAFormat,THREE.UnsignedByteType);
      texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;texture.flipY=false;texture.unpackAlignment=1;texture.needsUpdate=true;this.textures.push(texture);
      const material=new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:SKY_VERTEX.replace('#version 300 es',''),fragmentShader:SKY_FRAGMENT.replace('#version 300 es',''),uniforms:{...this.uniforms,uPanorama:{value:texture},uSkyExposure:{value:i?.62:1.33},uSkySaturation:{value:i?1.10:1.28},uSkyKind:{value:i},uSkyOpacity:{value:1}},depthWrite:false,depthTest:false,transparent:!!i,blending:i?THREE.NormalBlending:THREE.NoBlending,toneMapped:false});
      const mesh=new THREE.Mesh(this.geometry,material);mesh.frustumCulled=false;mesh.renderOrder=i;this.scene.add(mesh);this.materials.push(material);
    });
  }
  render(renderer,camera,state){
    if(!this.materials.length)return;
    camera.updateMatrixWorld();camera.getWorldDirection(this.uniforms.uForward.value);
    this.uniforms.uRight.value.setFromMatrixColumn(camera.matrixWorld,0);this.uniforms.uUp.value.setFromMatrixColumn(camera.matrixWorld,1);
    const scale=Math.tan(THREE.MathUtils.degToRad(camera.fov)*.5);this.uniforms.uViewScale.value.set(scale*camera.aspect,scale);
    const night=skyNight(state);this.scene.children[0].visible=night<1;this.scene.children[1].visible=night>0;this.materials[1].uniforms.uSkyOpacity.value=night;
    const autoClear=renderer.autoClear,shadows=renderer.shadowMap.enabled;
    try{renderer.autoClear=false;renderer.shadowMap.enabled=false;renderer.render(this.scene,camera);}
    finally{renderer.autoClear=autoClear;renderer.shadowMap.enabled=shadows;}
  }
  dispose(){this.geometry.dispose();this.materials.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());this.scene.clear();}
}
