import * as THREE from 'three';
import {LOADING_FOCUS_GLSL} from './loading-focus-light.js';

// One untextured triangle behind the patch. Analytic height/distance haze,
// without ray marching, noise, depth sampling, additional assets or shadows.
export class LoadingMist {
 constructor(sky,focusUniforms={}){
  this.scene=new THREE.Scene();this.day=new THREE.Color('#e6d5b5');this.night=new THREE.Color('#26364a');
  this.uniforms={...sky.uniforms,...focusUniforms,uFogColor:{value:this.day.clone().convertLinearToSRGB()},uEyeHeight:{value:7.5},uNight:{value:0}};
  this.material=new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,uniforms:this.uniforms,depthWrite:false,depthTest:false,transparent:true,toneMapped:false,
   vertexShader:'precision highp float;out vec2 vScreen;void main(){vec2 p=gl_VertexID==0?vec2(-1.,-1.):gl_VertexID==1?vec2(3.,-1.):vec2(-1.,3.);vScreen=p;gl_Position=vec4(p,0.,1.);}',
   fragmentShader:'precision highp float;\n'+LOADING_FOCUS_GLSL+'in vec2 vScreen;uniform vec3 uForward,uRight,uUp,uFogColor;uniform vec2 uViewScale;uniform float uEyeHeight,uNight;out vec4 color;void main(){vec3 ray=normalize(uForward+uRight*vScreen.x*uViewScale.x+uUp*vScreen.y*uViewScale.y);float groundDistance=uEyeHeight/max(.015,-ray.y);float distant=smoothstep(7.,24.,groundDistance);float belowHorizon=1.-smoothstep(-.28,.025,ray.y);float opacity=belowHorizon*mix(.86,.96,distant);float shaft=pow(max(0.,1.-abs(vScreen.x+.06)/(.12+.2*(1.-vScreen.y))),3.)*smoothstep(-.38,.65,vScreen.y)*mix(.42,.16,uNight)*(1.-smoothstep(.2,.85,uForward.y));vec3 light=mix(vec3(1.,.92,.68),vec3(.5,.66,.92),uNight);float air=uNight*.28*(1.-belowHorizon)*(1.-smoothstep(.2,.85,uForward.y));float alpha=opacity+(shaft+air)*(1.-opacity);vec3 haze=mix(uFogColor,vec3(.08,.14,.3),air/max(.001,alpha));color=vec4(mix(haze,light,shaft/max(.001,alpha)),alpha);float edge=loadingFocusEdge()*uLoadingFocusAmount;float shade=edge*mix(.16,.18,uNight);float shadedAlpha=color.a+(1.-color.a)*shade;color.rgb*=mix(1.,.84,edge)*color.a/max(.001,shadedAlpha);color.a=shadedAlpha;}'});
  // NativeSky owns this immutable three-vertex fullscreen geometry.
  const triangle=new THREE.Mesh(sky.geometry,this.material);triangle.frustumCulled=false;this.scene.add(triangle);
 }
 render(renderer,camera,night){this.uniforms.uFogColor.value.copy(night===1?this.night:this.day);if(night>0&&night<1)this.uniforms.uFogColor.value.lerp(this.night,night);this.uniforms.uFogColor.value.convertLinearToSRGB();this.uniforms.uEyeHeight.value=Math.max(.1,camera.position.y);this.uniforms.uNight.value=night;renderer.render(this.scene,camera);}
 dispose(){this.material.dispose();this.scene.clear();}
}
