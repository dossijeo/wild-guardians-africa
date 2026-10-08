// Optional future arm. Not imported by the frozen three-group GPU fixture.
// Coalesces only contiguous identical Front recipes; no face/view selection.
export function coalesceSharedLeafForwardGroups(mesh){
 const groups=mesh.geometry.groups,materials=mesh.material;
 if(groups.length!==3||!Array.isArray(materials)||materials.length!==3||groups.some((g,i)=>g.materialIndex!==i)||groups[0].start!==0||groups[1].start!==groups[0].count||groups[2].start!==groups[0].count+groups[1].count)throw Error('Unexpected shared reverse layout');
 const a=materials[0],b=materials[1];
 // These source clones must remain identical in fields that define the present
 // crop shader and its physical/material sampling. Back recipe stays separate.
 const keys=['type','side','shadowSide','transparent','opacity','alphaTest','depthTest','depthWrite','blending','vertexColors','flatShading','roughness','metalness','normalMapType','map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','bumpMap','displacementMap','onBeforeCompile','customProgramCacheKey'];
 if(keys.some(key=>a[key]!==b[key])||a.color?.equals(b.color)!==true||a.emissive?.equals(b.emissive)!==true||a.normalScale?.equals(b.normalScale)!==true||JSON.stringify(a.defines)!==JSON.stringify(b.defines))throw Error('Forward material recipe mismatch');
 const previousGroups=groups.map(g=>({...g})),previousMaterials=materials;
 mesh.geometry.clearGroups();mesh.geometry.addGroup(0,previousGroups[0].count+previousGroups[1].count,0);mesh.geometry.addGroup(previousGroups[2].start,previousGroups[2].count,1);mesh.material=[a,materials[2]];
 return {restore(){mesh.geometry.clearGroups();for(const g of previousGroups)mesh.geometry.addGroup(g.start,g.count,g.materialIndex);mesh.material=previousMaterials;},indexCount:mesh.geometry.index.count,originalGroups:previousGroups,newGroups:mesh.geometry.groups.map(g=>({...g})),meaning:'Same contiguous face indices and source-forward recipe, separate source-back draw. No GPU saving or visual approval asserted.'};
}
