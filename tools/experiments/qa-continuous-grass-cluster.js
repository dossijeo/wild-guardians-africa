import {applyMaterialStudy as base} from '/tools/experiments/qa-continuous-grass.js';
export async function applyMaterialStudy(world,variant='C'){
 await base(world,'C');const q=world.qaContinuousGrass;
 if(!q.clusterStudy){
 q.clusterStudy=true;
 for(const e of q.meshes){const m=e.mesh.material;m.uniforms.uCoverageCluster={value:0};
 m.vertexShader=`uniform float uCoverageCluster;
 float clusterHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float clusterNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(clusterHash(i),clusterHash(i+vec2(1.,0.)),f.x),mix(clusterHash(i+vec2(0.,1.)),clusterHash(i+vec2(1.,1.)),f.x),f.y);}
 `+m.vertexShader;
 m.vertexShader=m.vertexShader.replace('float ca=cos(coverageData.x)',`float clusterValue=clusterNoise(coverageAnchor.xz*.32+vec2(8.,17.));
 float heightGroup=mix(1.,.45+1.05*smoothstep(.15,.85,clusterValue),uCoverageCluster);
 float ca=cos(coverageData.x)`)
 .replace('pos.y*=coverageAnchor.w;', 'pos.y*=coverageAnchor.w*heightGroup;')
 .replace('position.y*coverageAnchor.w,0.', 'position.y*coverageAnchor.w*heightGroup,0.')
 .replace('vec3 N=normal;', 'vec3 N=normal;N.y/=heightGroup;')
 .replace('*wave*position.y*dot', '*wave*position.y*heightGroup*dot');m.needsUpdate=true;
 }
 }
 for(const e of q.meshes)e.mesh.material.uniforms.uCoverageCluster.value=variant==='cluster'?1:0;
 return {...q.audit(),cluster:variant==='cluster',windStrength:q.uniforms.uCoverageWindStrength.value};
}
