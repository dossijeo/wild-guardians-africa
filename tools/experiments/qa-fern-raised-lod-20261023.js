import * as THREE from 'three';
export async function applyCompositeFernLOD(world,q){
 const e=q.meshes[1],g=e.mesh.geometry,m=e.mesh.material;
 const ts=await Promise.all(['color','normal'].map(k=>new THREE.TextureLoader().loadAsync('/assets/visual-lab/fern-composite-lod-20261023/'+k+'.png')));
 ts[0].colorSpace=THREE.SRGBColorSpace;ts[1].colorSpace=THREE.NoColorSpace;
 // QA diagnostic: one raised composite per original far clump. No thinning.
 const arrays={position:[],flatPosition:[],normal:[],flatNormal:[],bladeRoot:[],uv:[],cardUv:[],frondAngle:[],frondSlope:[]},indices=[];
 for(let z=0;z<3;z++)for(let x=0;x<3;x++){
  const h=x===1&&z===1?.056:(x===1||z===1?.32:.22);
  for(const name of ['position','flatPosition'])arrays[name].push((x-1)*1.06,h,(z-1)*1.06);
  for(const name of ['normal','flatNormal'])arrays[name].push(0,1,0);
  arrays.bladeRoot.push(0,0,0);arrays.uv.push(1,.2);arrays.cardUv.push(x/2,z/2);arrays.frondAngle.push(0);arrays.frondSlope.push(0);
 }
 for(let z=0;z<2;z++)for(let x=0;x<2;x++){const a=z*3+x;indices.push(a,a+3,a+1,a+1,a+3,a+4);}
 for(const [name,array]of Object.entries(arrays))g.setAttribute(name,new THREE.Float32BufferAttribute(array,['uv','cardUv'].includes(name)?2:['frondAngle','frondSlope'].includes(name)?1:3));
 g.setIndex(indices);g.boundingBox=null;g.boundingSphere=null;
 m.uniforms.uLeafCoverage.value=ts[0];m.uniforms.uLeafNormal.value=ts[1];
 // Far clumps have no vertex wind in the existing shader; retain that behaviour.
 m.fragmentShader=m.fragmentShader.replace('vec4 leaf=texture(uLeafCoverage,vCardUv);','float compositeTip=clamp(length(vCardUv-.5)*2.,0.,1.);\n vec4 leaf=texture(uLeafCoverage,vCardUv);').replaceAll('vCoverageTip)', 'compositeTip)').replaceAll('*vCoverageTip','*compositeTip');m.needsUpdate=true;
 const dispose=q.dispose.bind(q);q.dispose=()=>{if(q.disposed)return;ts.forEach(t=>t.dispose());dispose();};
 q.cardStudy.compositeFar={triangles:8,textureResolution:512,originalNearTriangles:32,projection:'shallow raised diagnostic, not approved',instanceDensityUnchanged:true};
}
