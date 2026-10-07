// QA only: estimate implicit texture footprint before alpha-discard divergence.
// This is not textureQueryLOD, driver-selected levels or product shading.
export function mountainLodDiagnosticFragment(source){
 if(typeof source!=='string')throw Error('Expected backdrop fragment source');
 const main=/void\s+main\s*\(\s*\)\s*\{/g;
 const color='#include <colorspace_fragment>';
 if([...source.matchAll(main)].length!==1||source.split(color).length!==2)throw Error('Unexpected backdrop shader contract');
 const footprint=`vec2 qaDx=dFdx(vBackdropUv*uBackdropDebugSize);vec2 qaDy=dFdy(vBackdropUv*uBackdropDebugSize);float qaLod=.5*log2(max(1.,max(dot(qaDx,qaDx),dot(qaDy,qaDy))));`;
 const grading=`vec3 qaColor=qaLod>=5.?vec3(1.,0.,1.):qaLod>=4.?vec3(1.,.5,0.):mix(vec3(0.,.2,1.),vec3(0.,1.,.2),clamp(qaLod/4.,0.,1.));gl_FragColor=vec4(qaColor,1.);`;
 return 'uniform vec2 uBackdropDebugSize;\n'+source.replace(main,match=>match+footprint).replace(color,grading+'\n'+color);
}

export function mountainCameraElevation(value){
 const number=Number(value);
 if(!Number.isFinite(number)||number<0||number>600)throw Error('Camera elevation must be 0–600 m');
 return number;
}
