import {ShaderChunk} from 'three';
// Reuse Three's single fog-color mix. Only distant density/distance removal
// washes its contrast first; faithful 3D handoff does not alter lighting.
export function densityFogFactor(coverage){
 if(!Number.isFinite(coverage)||coverage<0||coverage>1)throw Error('Invalid far density coverage');
 const squared=coverage*coverage,fourth=squared*squared;return 1-fourth*fourth;
}
const marker='gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );';
if(!ShaderChunk.fog_fragment.includes(marker))throw Error('Unsupported Three fog recipe');
export const densityFogFragment=ShaderChunk.fog_fragment.replace(marker,
 'float densitySquared = vDensityFade * vDensityFade;\n float densityFourth = densitySquared * densitySquared;\n fogFactor = max( fogFactor, 1.0 - densityFourth * densityFourth );\n '+marker);
