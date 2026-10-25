import {applyMaterialStudy as base} from '/tools/experiments/qa-continuous-grass.js';
export async function applyMaterialStudy(world,variant='C'){
 await base(world,'C');const q=world.qaContinuousGrass;
 if(!q.rotationalStudy){q.rotationalStudy=true;
 for(const e of q.meshes){const m=e.mesh.material;e.originalWindVertex=m.vertexShader;
 e.rotationalWindVertex=m.vertexShader.replace('pos.xz+=windDirection*bend;',`// Rotate about each blade root in the wind/vertical plane, with a ground-facing angular bound.
 vec3 pivot=localRoot;pivot.y=dot(coverageSlope,pivot.xz);
 vec3 bladeOffset=pos-pivot;bladeOffset.y-=dot(coverageSlope,bladeOffset.xz);
 float along=dot(bladeOffset.xz,windDirection);
 float angle=uCoverageRefined*.18*uCoverageWindStrength*wave*uv.x;
 float upper=atan(max(bladeOffset.y,0.00001),max(along,0.00001))*.92;
 float lower=atan(max(bladeOffset.y,0.00001),max(-along,0.00001))*.92;
 angle=clamp(angle,-lower,upper);
 float c=cos(angle),s=sin(angle);
 bladeOffset.xz+=windDirection*(along*(c-1.)+bladeOffset.y*s);
 bladeOffset.y=bladeOffset.y*c-along*s;
 bladeOffset.y+=dot(coverageSlope,bladeOffset.xz);pos=pivot+bladeOffset;`)
 .replace('N.y-=uCoverageRefined*uCoverageWindStrength*wave*position.y*dot(N.xz,windDirection);',`float normalAlong=dot(N.xz,windDirection);N.xz+=windDirection*(normalAlong*(c-1.)+N.y*s);N.y=N.y*c-normalAlong*s;`);
 }
 }
 const enabled=variant==='rotation';
 for(const e of q.meshes){const shader=enabled?e.rotationalWindVertex:e.originalWindVertex;if(e.mesh.material.vertexShader!==shader){e.mesh.material.vertexShader=shader;e.mesh.material.needsUpdate=true;}}
 return {...q.audit(),rotationalWind:enabled,windStrength:q.uniforms.uCoverageWindStrength.value};
}
