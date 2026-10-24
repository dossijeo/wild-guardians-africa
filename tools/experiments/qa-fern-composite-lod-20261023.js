import * as THREE from 'three';
export async function applyCompositeFernLOD(world,q){
 const e=q.meshes[1],g=e.mesh.geometry,m=e.mesh.material;
 const ts=await Promise.all(['color','normal'].map(k=>new THREE.TextureLoader().loadAsync('/assets/visual-lab/fern-composite-lod-20261023/'+k+'.png')));
 ts[0].colorSpace=THREE.SRGBColorSpace;ts[1].colorSpace=THREE.NoColorSpace;
 // QA diagnostic: one horizontal composite per original far clump. No thinning.
 const position=[-1.06,.18,-1.06,1.06,.18,-1.06,1.06,.18,1.06,-1.06,.18,1.06];
 for(const [name,size,array] of [['position',3,position],['flatPosition',3,position],['normal',3,[0,1,0,0,1,0,0,1,0,0,1,0]],['flatNormal',3,[0,1,0,0,1,0,0,1,0,0,1,0]],['bladeRoot',3,Array(12).fill(0)],['uv',2,[1,.2,1,.2,1,.2,1,.2]],['cardUv',2,[0,0,1,0,1,1,0,1]],['frondAngle',1,[0,0,0,0]],['frondSlope',1,[0,0,0,0]]])g.setAttribute(name,new THREE.Float32BufferAttribute(array,size));
 g.setIndex([0,2,1,0,3,2]);g.boundingBox=null;g.boundingSphere=null;
 m.uniforms.uLeafCoverage.value=ts[0];m.uniforms.uLeafNormal.value=ts[1];
 // Far clumps have no vertex wind in the existing shader; retain that behaviour.
 m.fragmentShader=m.fragmentShader.replace('vec4 leaf=texture(uLeafCoverage,vCardUv);','float compositeTip=clamp(length(vCardUv-.5)*2.,0.,1.);\n vec4 leaf=texture(uLeafCoverage,vCardUv);').replaceAll('vCoverageTip)', 'compositeTip)').replaceAll('*vCoverageTip','*compositeTip');m.needsUpdate=true;
 const dispose=q.dispose.bind(q);q.dispose=()=>{if(q.disposed)return;ts.forEach(t=>t.dispose());dispose();};
 q.cardStudy.compositeFar={triangles:2,textureResolution:512,originalNearTriangles:32,projection:'horizontal diagnostic, not approved',instanceDensityUnchanged:true};
}
