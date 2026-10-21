import * as THREE from 'three';
import {installNativeShadow} from './native-shadow.js';
import {installLoadingContact} from './loading-contact.js';
export function loadingDiffuseEnabled(search=globalThis.location?.search??''){return new URLSearchParams(search).get('loadingBeam')==='diffuse';}
// Loading-only analytic light and atmosphere. Reuses existing material draws.
export function installLoadingDiffuseBeam(d){
 d.mist.day.set('#ead4b4');d.mist.night.set('#102d5b');
 d.sun.castShadow=true;d.sun.shadow.mapSize.set(512,512);
 Object.assign(d.sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:1,far:100});d.sun.shadow.camera.updateProjectionMatrix();
 d.scene.add(d.sun.target);d.ground.receiveShadow=true;
 d.scene.traverse(mesh=>{if(mesh.isInstancedMesh){mesh.castShadow=true;mesh.receiveShadow=true;}});
 const release=installNativeShadow(d.world.renderer,d.sun,d.toon.shadowUniforms);
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
 candidate=candidate.replace('edge*mix(.30,.28,uNight)','edge*mix(.08,.28,uNight)').replace('mix(1.,.70,edge)','mix(1.,mix(.96,.70,uNight),edge)');
 const mode={value:1},islandInner={value:2.9},seen=new Set();
 const sourceDirection=new THREE.Vector3(.48,1,0).normalize(),worldDirection=new THREE.Vector3();
 const update=()=>{d.camera.updateMatrixWorld();worldDirection.copy(sourceDirection).applyQuaternion(d.camera.quaternion);d.sun.position.copy(d.sun.target.position).addScaledVector(worldDirection,60);};
 const updateIsland=()=>{islandInner.value=Math.max(2.9,...d.plants.plants.map(p=>Math.hypot(p.x,p.z)+.6));};
 updateIsland();update();
 d.scene.traverse(mesh=>{for(const m of [mesh.material].flat().filter(Boolean)){
  if(!m.isMeshStandardMaterial||seen.has(m))continue;seen.add(m);
  const compile=m.onBeforeCompile,key=m.customProgramCacheKey();
  m.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('mix(1.30,3.00,uLoadingFocusNight)','mix(1.30,2.30,uLoadingFocusNight)');shader.uniforms.uLoadingDiffuse=mode;shader.uniforms.uIslandInner=islandInner;
   let visibility='nativeDirectVisibility';
   if(!shader.fragmentShader.includes('float nativeDirectVisibility=')){
    visibility='loadingBeamVisibility';
    const shadowCall='getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] )';
    if(!THREE.ShaderChunk.lights_fragment_begin.includes(shadowCall))throw Error('Shadow visibility anchor missing');
    const lights=THREE.ShaderChunk.lights_fragment_begin.replace(shadowCall,'(loadingBeamVisibility='+shadowCall+')');
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>','float loadingBeamVisibility=1.;\n'+lights);
   }
   const token=shader.fragmentShader.includes('outgoingLight*=1.-.38*contact;')?'outgoingLight*=1.-.38*contact;':'#include <opaque_fragment>';
   shader.fragmentShader='uniform float uLoadingDiffuse,uIslandInner;\n'+shader.fragmentShader.replace(token,`{
    vec2 beamScreen=gl_FragCoord.xy/max(uLoadingFocusSize,vec2(1.))*2.-1.;
    ${profile}
    vec3 beamDirection=normalize(vec3(.48,1.,0.));
    float beamLambert=max(0.,dot(normalize(normal),beamDirection));
    ${mesh===d.ground?'beamFootprint=max(beamFootprint,.85*exp(-pow((beamScreen.x*beamAspect+.08)/.55,2.)-pow((beamScreen.y+.37)/.32,2.)));':''}
    vec3 beamTint=mix(vec3(1.,.80,.42),vec3(.75,.90,.74),uLoadingFocusNight);
    outgoingLight*=mix(1.,${mesh===d.ground?'mix(.46,.18,uLoadingFocusNight)':'mix(.72,.30,uLoadingFocusNight)'},uLoadingDiffuse);
    outgoingLight+=diffuseColor.rgb*beamTint*beamFootprint*(.24+.76*beamLambert)*mix(.16,1.,${visibility})*${mesh===d.ground?'mix(1.2,3.0,uLoadingFocusNight)':'mix(2.1,3.5,uLoadingFocusNight)'}*uLoadingDiffuse;
    ${mesh===d.ground?`float rim=smoothstep(2.5,6.2,length(vLoadingSoil));
    outgoingLight=mix(outgoingLight,mix(vec3(.44,.32,.20),vec3(.003,.010,.025),uLoadingFocusNight),rim*.6*uLoadingDiffuse);
    diffuseColor.a*=mix(1.,1.-smoothstep(uIslandInner,uIslandInner+2.3,length(vLoadingSoil)),uLoadingDiffuse);`:''}
   }\n`+token);
  };m.customProgramCacheKey=()=>key+'|loading-diffuse-v1';m.needsUpdate=true;
 }});
 const contact=installLoadingContact(d);
 mist.fragmentShader=candidate;mist.needsUpdate=true;let disposed=false;
 return {update,plant(){updateIsland();contact.sync();},dispose(){if(disposed)return;disposed=true;release();d.sun.shadow.dispose();}};
}
