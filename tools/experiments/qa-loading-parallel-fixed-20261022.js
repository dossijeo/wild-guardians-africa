// QA only: fixed camera from LoadingDiorama; no framing/zoom adapter.
export function installParallelIsland(d){
 const profile=`float beamAspect=uLoadingFocusSize.x/max(1.,uLoadingFocusSize.y);
 float beamY=beamScreen.y;
 float across=beamScreen.x*beamAspect-(.197+.633*beamY);
 float beamFootprint=(.66*pow(max(0.,1.-abs(across+.23)/.15),2.)
  +.9*pow(max(0.,1.-abs(across+.065)/.115),2.)
  +.72*pow(max(0.,1.-abs(across-.09)/.14),2.)
  +.48*pow(max(0.,1.-abs(across-.29)/.095),2.)
  +.28*pow(max(0.,1.-abs(across)/.65),2.5))*smoothstep(-.65,-.12,beamScreen.y);`;
 const mist=d.mist.material,original=mist.fragmentShader;
 const start=original.indexOf('float shaft='),end=original.indexOf('vec3 light=',start);
 if(start<0||end<0)throw Error('Mist anchors missing');
 const candidate=original.slice(0,start)+'vec2 beamScreen=vScreen;'+profile+'float shaft=beamFootprint*mix(.88,.72,uNight)*(1.-smoothstep(.2,.85,uForward.y));'+original.slice(end);
 const mode={value:0},seen=new Set();
 d.scene.traverse(mesh=>{for(const m of [mesh.material].flat().filter(Boolean)){
  if(!m.isMeshStandardMaterial||seen.has(m))continue;seen.add(m);
  const compile=m.onBeforeCompile,key=m.customProgramCacheKey();
  m.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);shader.uniforms.uParallelIsland=mode;
   const token=shader.fragmentShader.includes('outgoingLight*=1.-.38*contact;')?'outgoingLight*=1.-.38*contact;':'#include <opaque_fragment>';
   shader.fragmentShader='uniform float uParallelIsland;\n'+shader.fragmentShader.replace(token,`{
    vec2 beamScreen=gl_FragCoord.xy/max(uLoadingFocusSize,vec2(1.))*2.-1.;
    ${profile}
    vec3 beamDirection=normalize(vec3(.55,.82,.15));
    float beamLambert=max(0.,dot(normalize(normal),beamDirection));
    vec3 beamTint=mix(vec3(1.,.80,.42),vec3(.48,.70,1.),uLoadingFocusNight);
    outgoingLight+=diffuseColor.rgb*beamTint*beamFootprint*(.18+.82*beamLambert)*mix(1.1,1.65,uLoadingFocusNight)*uParallelIsland;
    ${mesh===d.ground?`float rim=smoothstep(2.5,6.2,length(vLoadingSoil));
    outgoingLight=mix(outgoingLight,mix(vec3(.55,.40,.23),vec3(.012,.035,.09),uLoadingFocusNight),rim*.6*uParallelIsland);
    diffuseColor.a*=1.-rim*.6*uParallelIsland;`:''}
   }\n`+token);
  };m.customProgramCacheKey=()=>key+'|parallel-island-fixed-v1';m.needsUpdate=true;
 }});
 return enabled=>{mode.value=enabled?1:0;mist.fragmentShader=enabled?candidate:original;mist.needsUpdate=true;};
}
