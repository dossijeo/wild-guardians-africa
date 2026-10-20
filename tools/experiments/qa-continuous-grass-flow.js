import {applyMaterialStudy as base} from '/tools/experiments/qa-continuous-grass.js';
export async function applyMaterialStudy(world,variant='C'){
 await base(world,'C');const q=world.qaContinuousGrass;
 // Historical rejected study: keep the original 1x wind for reproducible comparisons.
 q.uniforms.uCoverageWindStrength.value=1;
 if(!q.flowStudy){
 const data=await(await fetch('/assets/visual-lab/continuous-grass-flow/modules.json')).json();
 q.flowStudy={data};
 for(const e of q.meshes){const m=e.mesh.material;m.uniforms.uCoverageFlow={value:0};
 m.vertexShader=m.vertexShader.replace('uniform float uCoverageTime,','uniform float uCoverageFlow;\nuniform float uCoverageTime,')
 .replace('float ca=cos(coverageData.x),sa=sin(coverageData.x);',`float orientation=coverageData.x;float heightGroup=1.;
 if(uCoverageFlow>.5){orientation=.4+.6*sin(coverageAnchor.x*.16+coverageAnchor.z*.11)+.3*cos(coverageAnchor.z*.23)+.35*sin(coverageData.x);heightGroup=.95+.15*sin(coverageAnchor.x*.42)*cos(coverageAnchor.z*.38);}
 float ca=cos(orientation),sa=sin(orientation);`)
 .replace('pos.y*=coverageAnchor.w;', 'pos.y*=coverageAnchor.w*heightGroup;')
 .replace('vec3 N=normal;', 'vec3 N=normal;N.y/=heightGroup;');m.needsUpdate=true;
 }
 }
 const enabled=variant==='flow';
 for(let i=0;i<q.meshes.length;i++){const e=q.meshes[i],d=enabled?q.flowStudy.data[i===0?'refined':'light']:e.data;
 for(const name of ['position','normal','flatPosition','bladeRoot','uv']){e.mesh.geometry.attributes[name].array.set(d[name]);e.mesh.geometry.attributes[name].needsUpdate=true;}
 e.mesh.material.uniforms.uCoverageFlow.value=enabled?1:0;
 }
 q.flowStudy.variant=variant;return {...q.audit(),flow:enabled};
}
