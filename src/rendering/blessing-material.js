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
  if(object)shader.uniforms.uBlessingObject=object;
  shader.fragmentShader='uniform float uBlessingClock;\n'+(object?'uniform vec4 uBlessingObject;\n':'')+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
    vec4 blessingInfo=${instanced?'vBlessingInfo':'uBlessingObject'};
    if(blessingInfo.x>.5){
      float awakeningAge=max(0.,uBlessingClock-blessingInfo.y);
      float awakeningBurst=1.-smoothstep(0.,2.8,awakeningAge);
      float awakeningPulse=pow(max(0.,sin(uBlessingClock*.65)),12.);
      float awakeningWound=1.-smoothstep(0.,.45,max(0.,uBlessingClock-blessingInfo.z));
      float organicMask=${instanced?'smoothstep(.008,.10,diffuseColor.g-diffuseColor.r*.70)':'(.25+3.*pow(.5+.5*sin(vToonWorld.y*11.+sin(vToonWorld.x*2.7+vToonWorld.z*1.9)*1.4),24.))'};
      ${instanced?'organicMask*=.3+.7*smoothstep(.25,.85,abs(normalize(normal).z));':''}
      outgoingLight+=vec3(.025,.38,.27)*organicMask*(.18+.20*awakeningPulse+1.25*awakeningBurst);
      outgoingLight+=vec3(.42,.10,.025)*awakeningWound;
    }
    if(blessingInfo.w>.5){
      float eligibleRim=1.-abs(dot(normalize(normal),normalize(vViewPosition)));
      outgoingLight+=vec3(.12,.22,.07)*smoothstep(.35,.9,eligibleRim);
    }
    #include <opaque_fragment>`);
}
