import * as THREE from 'three';
// QA only: fixed camera from LoadingDiorama; no framing/zoom adapter.
export function installParallelIsland(d){
 const profile=`float beamAspect=uLoadingFocusSize.x/max(1.,uLoadingFocusSize.y);
 float across=beamScreen.x*beamAspect-(-.12+.48*beamScreen.y);
 float beamFootprint=(.38*exp(-pow((across+.29)/.29,2.))
  +.50*exp(-pow((across+.09)/.24,2.))
  +.43*exp(-pow((across-.13)/.28,2.))
  +.24*exp(-pow((across-.34)/.23,2.)))
  *smoothstep(-.68,-.10,beamScreen.y);`;

 const mist=d.mist.material,original=mist.fragmentShader;
 const start=original.indexOf('float shaft='),end=original.indexOf('vec3 light=',start);
 if(start<0||end<0)throw Error('Mist anchors missing');
 let candidate=original.slice(0,start)+'vec2 beamScreen=vScreen;'+profile+'float shaft=beamFootprint*mix(.68,.52,uNight)*(1.-smoothstep(.2,.85,uForward.y));'+original.slice(end);
 candidate=candidate.replace('vec3(.5,.66,.92)','vec3(.38,.72,1.)');
 candidate=candidate.replace('float edge=loadingFocusEdge()',`vec2 starGrid=(vScreen*.5+.5)*vec2(70.,40.);
 vec2 cell=floor(starGrid);float starHash=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
 vec2 jitter=vec2(fract(starHash*71.7),fract(starHash*123.9));
 float starDistance=length(fract(starGrid)-(.15+.7*jitter));
 float stars=(exp(-starDistance*starDistance/ .003)*.8+exp(-starDistance*starDistance/.025)*.12)*step(.94,starHash)*smoothstep(-.1,.35,vScreen.y)*uNight;
 color.rgb+=vec3(.35,.68,1.)*stars; color.a=max(color.a,stars*.8);
 float edge=loadingFocusEdge()`);
 const mode={value:0},islandInner={value:2.9},seen=new Set();
 const originalSun=d.sun.position.clone(),sourceDirection=new THREE.Vector3(.48,1,0).normalize(),worldDirection=new THREE.Vector3();
 const projection=d.camera.updateProjectionMatrix.bind(d.camera);
 d.camera.updateProjectionMatrix=()=>{projection();if(mode.value){d.camera.updateMatrixWorld();worldDirection.copy(sourceDirection).applyQuaternion(d.camera.quaternion);d.sun.position.copy(d.sun.target.position).addScaledVector(worldDirection,60);}else d.sun.position.copy(originalSun);};
 const updateIsland=()=>{islandInner.value=Math.max(2.9,...d.plants.plants.map(p=>Math.hypot(p.x,p.z)+.6));};
 const planted=d.onPlant;d.onPlant=p=>{planted?.(p);updateIsland();};updateIsland();
 d.scene.traverse(mesh=>{for(const m of [mesh.material].flat().filter(Boolean)){
  if(!m.isMeshStandardMaterial||seen.has(m))continue;seen.add(m);
  const compile=m.onBeforeCompile,key=m.customProgramCacheKey();
  m.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);shader.uniforms.uParallelIsland=mode;shader.uniforms.uIslandInner=islandInner;
   let visibility='nativeDirectVisibility';
   if(!shader.fragmentShader.includes('float nativeDirectVisibility=')){
    visibility='loadingBeamVisibility';
    const shadowCall='getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] )';
    if(!THREE.ShaderChunk.lights_fragment_begin.includes(shadowCall))throw Error('Shadow visibility anchor missing');
    const lights=THREE.ShaderChunk.lights_fragment_begin.replace(shadowCall,'(loadingBeamVisibility='+shadowCall+')');
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>','float loadingBeamVisibility=1.;\n'+lights);
   }
   const token=shader.fragmentShader.includes('outgoingLight*=1.-.38*contact;')?'outgoingLight*=1.-.38*contact;':'#include <opaque_fragment>';
   shader.fragmentShader='uniform float uParallelIsland,uIslandInner;\n'+shader.fragmentShader.replace(token,`{
    vec2 beamScreen=gl_FragCoord.xy/max(uLoadingFocusSize,vec2(1.))*2.-1.;
    ${profile}
    vec3 beamDirection=normalize(vec3(.48,1.,0.));
    float beamLambert=max(0.,dot(normalize(normal),beamDirection));
    ${mesh===d.ground?'beamFootprint=max(beamFootprint,.85*exp(-pow((beamScreen.x*beamAspect+.08)/.55,2.)-pow((beamScreen.y+.37)/.32,2.)));':''}
    vec3 beamTint=mix(vec3(1.,.80,.42),vec3(.75,.90,.74),uLoadingFocusNight);
    outgoingLight*=mix(1.,${mesh===d.ground?'mix(.46,.18,uLoadingFocusNight)':'mix(.72,.30,uLoadingFocusNight)'},uParallelIsland);
    outgoingLight+=diffuseColor.rgb*beamTint*beamFootprint*(.24+.76*beamLambert)*mix(.16,1.,${visibility})*${mesh===d.ground?'mix(1.2,3.0,uLoadingFocusNight)':'mix(2.1,3.5,uLoadingFocusNight)'}*uParallelIsland;
    ${mesh===d.ground?`float rim=smoothstep(2.5,6.2,length(vLoadingSoil));
    outgoingLight=mix(outgoingLight,mix(vec3(.44,.32,.20),vec3(.003,.010,.025),uLoadingFocusNight),rim*.6*uParallelIsland);
    diffuseColor.a*=mix(1.,1.-smoothstep(uIslandInner,uIslandInner+2.3,length(vLoadingSoil)),uParallelIsland);`:''}
   }\n`+token);
  };m.customProgramCacheKey=()=>key+'|parallel-island-diffuse-v1';m.needsUpdate=true;
 }});
 return enabled=>{mode.value=enabled?1:0;mist.fragmentShader=enabled?candidate:original;mist.needsUpdate=true;};
}
