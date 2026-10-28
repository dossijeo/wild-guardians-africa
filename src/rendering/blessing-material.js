import {blessingVineTexture} from './blessing-vine.js';
// Additional instance data only: original positions, silhouettes and shadow recipes stay intact.
export function declareBlessingInstance(shader){
  shader.vertexShader='attribute vec4 iBlessing;varying vec4 vBlessingInfo;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('void main() {','void main() {\n vBlessingInfo=iBlessing;');
  shader.fragmentShader='varying vec4 vBlessingInfo;\n'+shader.fragmentShader;
}
export function patchBlessingMaterial(shader,material,clock){
  const instanced=material.userData.blessingInstance,object=material.userData.blessingObject;
  if(!instanced&&!object)return;
  shader.uniforms.uBlessingClock=clock;
  if(object){
    shader.uniforms.uBlessingObject=object;shader.uniforms.uBlessingVine={value:blessingVineTexture()};
    shader.uniforms.uBlessingWallBounds=material.userData.blessingWallBounds??{value:{x:-1,y:0,z:2,w:1.5}};
    shader.vertexShader='varying vec3 vBlessingLocal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vBlessingLocal=position;');
  }
  shader.fragmentShader='uniform float uBlessingClock;\n'+(object?'uniform vec4 uBlessingObject,uBlessingWallBounds;uniform sampler2D uBlessingVine;varying vec3 vBlessingLocal;\n':'')+shader.fragmentShader;
  if(instanced){
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      if(vBlessingInfo.x>.5){
        float leaf=smoothstep(.005,.06,diffuseColor.g-max(diffuseColor.r*1.08,diffuseColor.b*1.05));
        float luminance=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.10,.62,.025)*(.45+luminance*1.8),leaf*.72);
      }`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      #ifndef FLAT_SHADED
      if(vBlessingInfo.x>.5){float leafNormal=smoothstep(.005,.06,diffuseColor.g-max(diffuseColor.r*1.08,diffuseColor.b*1.05));normal=normalize(mix(normal,normalize(vNormal)*faceDirection,.75*leafNormal));}
      #endif`);
  }
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
    vec4 blessingInfo=${instanced?'vBlessingInfo':'uBlessingObject'};
    if(blessingInfo.x>.5){
      float awakeningAge=max(0.,uBlessingClock-blessingInfo.y);
      float awakeningBurst=1.-smoothstep(0.,2.8,awakeningAge);
      float awakeningPulse=pow(max(0.,sin(uBlessingClock*.65)),12.);
      float awakeningWound=1.-smoothstep(0.,.45,max(0.,uBlessingClock-blessingInfo.z));
      ${instanced?`float organicMask=smoothstep(.005,.06,diffuseColor.g-max(diffuseColor.r*1.08,diffuseColor.b*1.05));
      vec3 magicNormal=normal;
      #ifndef FLAT_SHADED
      magicNormal=normalize(vNormal);
      #endif
      float magicRim=pow(1.-abs(dot(magicNormal,normalize(vViewPosition))),4.);
      outgoingLight+=organicMask*(vec3(.025,.16,.025)+vec3(.01,.75,.48)*magicRim)*(.9+.12*awakeningPulse+.6*awakeningBurst);`:`
      vec2 magicUV=(vBlessingLocal.xy-uBlessingWallBounds.xy)/uBlessingWallBounds.zw;
      float vine=texture2D(uBlessingVine,magicUV).r;
      float pillar=step(.36,abs(magicUV.x-.5));
      float band=(1.-smoothstep(.003,.012,abs(magicUV.y-.79)))*pillar;
      float rune=max(vine,band);
      outgoingLight*=1.-smoothstep(.1,.8,rune)*.45;
      outgoingLight+=vec3(.015,1.2,.8)*pow(rune,1.7)*(1.+.12*awakeningPulse+.6*awakeningBurst);
      outgoingLight+=vec3(.01,.18,.11)*pow(rune,.4);`}
      outgoingLight+=vec3(.42,.10,.025)*awakeningWound;
    }
    if(blessingInfo.w>.5){
      float eligibleRim=1.-abs(dot(normalize(normal),normalize(vViewPosition)));
      outgoingLight+=vec3(.12,.22,.07)*smoothstep(.35,.9,eligibleRim)*(blessingInfo.w>1.5?1.8:1.);
    }
    #include <opaque_fragment>`);
}
