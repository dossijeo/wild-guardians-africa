import {applyMaterialStudy as coverage} from './qa-continuous-grass-river.js';
// QA only: broaden the geometric fade, stagger its onset per existing module.
// No added instances, texture fetches, blending or fragment discard.
export async function applyMaterialStudy(world){
 await coverage(world,'C');
 const q=world.qaContinuousGrass,enabled={value:1};
 for(const {mesh} of q.meshes){
  const m=mesh.material,anchor='float farFade=1.-smoothstep(uCoverageFar-12.,uCoverageFar,distanceToEye);';
  if(!m.vertexShader.includes(anchor))throw Error('Grass fade anchor missing');
  m.uniforms.uQAEdgeBlend=enabled;
  m.vertexShader='uniform float uQAEdgeBlend;\n'+m.vertexShader.replace(anchor,anchor+'\nfloat qaFadeStart=mix(uCoverageFar-28.,uCoverageFar-18.,coverageData.y);float qaFade=1.-smoothstep(qaFadeStart,uCoverageFar,distanceToEye);farFade=mix(farFade,qaFade,uQAEdgeBlend);');
  m.needsUpdate=true;
 }
 q.setDistanceBlend=value=>{enabled.value=value?1:0};
}
