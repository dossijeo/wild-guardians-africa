// QA presentation light. Same projected footprint as the mist beam, with
// per-fragment normal response on the existing soil and maize materials.
export function installLoadingBeamLight(d){
 const enabled={value:0},seen=new Set();
 d.scene.traverse(mesh=>{for(const m of [mesh.material].flat().filter(Boolean)){
  if(!m.isMeshStandardMaterial||seen.has(m))continue;seen.add(m);
  const compile=m.onBeforeCompile,key=m.customProgramCacheKey();
  m.onBeforeCompile=function(shader,renderer){
   compile.call(this,shader,renderer);shader.uniforms.uLoadingBeamLight=enabled;
   const token=shader.fragmentShader.includes('outgoingLight*=1.-.38*contact;')?'outgoingLight*=1.-.38*contact;':'#include <opaque_fragment>';
   shader.fragmentShader='uniform float uLoadingBeamLight;\n'+shader.fragmentShader.replace(token,`
    vec2 beamScreen=gl_FragCoord.xy/max(uLoadingFocusSize,vec2(1.))*2.-1.;
    float beamAspect=uLoadingFocusSize.x/max(1.,uLoadingFocusSize.y);
    float beamY=clamp((beamScreen.y+.5)/1.5,0.,1.);
    float beamCentre=-.12+.95*beamY;
    float beamWidth=mix(.55,.09,beamY);
    float beamEdge=abs(beamScreen.x*beamAspect-beamCentre)/beamWidth;
    float beamFootprint=(pow(max(0.,1.-beamEdge),1.6)*.72+pow(max(0.,1.-beamEdge*.48),2.5)*.28)*smoothstep(-.65,-.12,beamScreen.y);
    vec3 beamDirection=normalize(vec3(.55,.82,.15));
    float beamLambert=max(0.,dot(normalize(normal),beamDirection));
    vec3 beamTint=mix(vec3(1.,.80,.42),vec3(.48,.70,1.),uLoadingFocusNight);
    outgoingLight+=diffuseColor.rgb*beamTint*beamFootprint*(.18+.82*beamLambert)*mix(1.1,1.65,uLoadingFocusNight)*uLoadingBeamLight;
    ${token}`);
  };m.customProgramCacheKey=()=>key+'|qa-loading-beam-light-v1';m.needsUpdate=true;
 }});
 return enabled;
}
