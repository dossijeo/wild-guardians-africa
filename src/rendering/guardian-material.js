import * as THREE from 'three';
// The spirit uses the world's sun/night uniforms and the original albedo and
// normal textures. A fixed lighting recipe avoids shader recompilation whenever
// native spell effects add/remove local lights. No global renderer changes.
export function guardianMaterial(source,toon){
 const uniforms=THREE.UniformsUtils.clone(THREE.ShaderLib.standard.uniforms);
 uniforms.diffuse.value.copy(source.color);uniforms.map.value=source.map;uniforms.normalMap.value=source.normalMap;uniforms.normalScale.value.copy(source.normalScale??new THREE.Vector2(1,1));
 Object.assign(uniforms,{uSun:toon.uniforms.uLightDir,uNight:toon.uniforms.uNight,uSpiritTint:{value:new THREE.Color(0xffffff)},uSpiritGlow:{value:.12},uReveal:{value:1},uDissolve:{value:0},uBottom:{value:-1.2},uHeight:{value:3}});
 const fragmentShader=`
 varying vec3 vViewPosition;
 varying vec3 vSpiritPosition;
 uniform vec3 diffuse,uSun,uSpiritTint;
 uniform float opacity,uNight,uSpiritGlow,uReveal,uDissolve,uBottom,uHeight;
 #include <common>
 #include <packing>
 #include <uv_pars_fragment>
 #include <map_pars_fragment>
 #include <normal_pars_fragment>
 #include <normalmap_pars_fragment>
 #include <fog_pars_fragment>
 void main(){
  vec4 diffuseColor=vec4(diffuse,opacity);
  #include <map_fragment>
  #include <normal_fragment_begin>
  #include <normal_fragment_maps>
  vec3 worldNormal=inverseTransformDirection(normal,viewMatrix);
  float sun=max(0.,dot(worldNormal,normalize(uSun)));
  float shade=smoothstep(-.15,.75,dot(worldNormal,normalize(uSun)));
  vec3 light=mix(vec3(.55,.51,.45),vec3(1.3,1.24,1.08),shade);
  light=mix(light,vec3(.3,.4,.48)+sun*.25,clamp(uNight,0.,1.));
  float height=clamp((vSpiritPosition.y-uBottom)/max(.1,uHeight),0.,1.);
  float noise=fract(sin(dot(floor(vSpiritPosition*55.),vec3(12.9898,78.233,37.719)))*43758.5453);
  float boundary=height*.75+noise*.25;
  if(uDissolve>boundary+.02)discard;
  float solid=1.-smoothstep(uReveal-.06,uReveal+.06,height);
  float edge=exp(-abs(height-uReveal)*35.);
  float breakup=smoothstep(boundary-.07,boundary,uDissolve)*step(.001,uDissolve);
  float rim=pow(1.-abs(dot(normal,normalize(vViewPosition))),2.);
  vec3 color=mix(uSpiritTint*(.18+.55*rim+.16*shade),diffuseColor.rgb*(light+uSpiritTint*uSpiritGlow),solid);
  color+=uSpiritTint*(edge*1.5+breakup*1.4);
  gl_FragColor=vec4(color,diffuseColor.a);
  #include <colorspace_fragment>
  #include <fog_fragment>
 }`;
 const vertexShader=('varying vec3 vSpiritPosition;\n'+THREE.ShaderLib.standard.vertexShader).replace('#include <project_vertex>','#include <project_vertex>\n vSpiritPosition=(modelMatrix*vec4(transformed,1.)).xyz;').replace('#include <shadowmap_pars_vertex>','').replace('#include <shadowmap_vertex>','');
 const material=new THREE.ShaderMaterial({name:'Guardian fixed world light',uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:true,side:source.side,fog:true,toneMapped:false});
 material.map=source.map;material.normalMap=source.normalMap;material.normalMapType=THREE.TangentSpaceNormalMap;material.forceSinglePass=true;
 return material;
}
