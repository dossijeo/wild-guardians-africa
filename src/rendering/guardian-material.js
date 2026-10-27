import * as THREE from 'three';
// The spirit uses the world's sun/night uniforms and the original albedo and
// normal textures. A fixed lighting recipe avoids shader recompilation whenever
// native spell effects add/remove local lights. No global renderer changes.
export function guardianMaterial(source,toon){
 const uniforms=THREE.UniformsUtils.clone(THREE.ShaderLib.standard.uniforms);
 uniforms.diffuse.value.copy(source.color);uniforms.map.value=source.map;uniforms.normalMap.value=source.normalMap;uniforms.normalScale.value.copy(source.normalScale??new THREE.Vector2(1,1));
 Object.assign(uniforms,{uSun:toon.uniforms.uLightDir,uNight:toon.uniforms.uNight,uSpiritTint:{value:new THREE.Color(0xffffff)},uSpiritGlow:{value:.12}});
 const fragmentShader=`
 varying vec3 vViewPosition;
 uniform vec3 diffuse,uSun,uSpiritTint;
 uniform float opacity,uNight,uSpiritGlow;
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
  vec3 color=diffuseColor.rgb*(light+uSpiritTint*uSpiritGlow);
  gl_FragColor=vec4(color,diffuseColor.a);
  #include <colorspace_fragment>
  #include <fog_fragment>
 }`;
 const vertexShader=THREE.ShaderLib.standard.vertexShader.replace('#include <shadowmap_pars_vertex>','').replace('#include <shadowmap_vertex>','');
 const material=new THREE.ShaderMaterial({name:'Guardian fixed world light',uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:true,side:source.side,fog:true,toneMapped:false});
 material.map=source.map;material.normalMap=source.normalMap;material.normalMapType=THREE.TangentSpaceNormalMap;material.forceSinglePass=true;
 return material;
}
