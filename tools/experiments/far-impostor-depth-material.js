// Isolated candidate: callers own installation and disposal; not enabled in production.
export function createFarImpostorDepthMaterial(source){
 if(!source?.isShaderMaterial||source.transparent||!source.depthWrite)throw Error('Expected opaque impostor shader');
 const depth=source.clone();depth.uniforms=source.uniforms;
 const compile=source.onBeforeCompile,key=source.customProgramCacheKey();
 depth.onBeforeCompile=function(shader,renderer){
  compile.call(this,shader,renderer);
  // Keep the authored vertex program and complete atlas sampling/discard prefix.
  // RGB lighting/output cannot influence coverage after this final alpha test.
  const anchor='if(c.a<.35)discard;';
  if(shader.fragmentShader.split(anchor).length!==2)throw Error('Unknown impostor alpha recipe');
  const prefix=shader.fragmentShader.slice(0,shader.fragmentShader.indexOf(anchor)+anchor.length);
  shader.fragmentShader=prefix+'gl_FragColor=vec4(1.);\n}';
 };
 depth.customProgramCacheKey=()=>key+'|world-impostor-depth-experiment-v1';
 depth.userData.worldDepthCompatible=true;
 return depth;
}
