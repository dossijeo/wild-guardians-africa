// QA only. This observes actual depth draws, not merely scene membership.
// Versions describe submitted buffers; they do not prove equality of their bytes.
export function captureDepthSubmissionState(world,render){
 const renderer=world.renderer,original=renderer.renderBufferDirect,rows=[];
 renderer.renderBufferDirect=function(camera,scene,geometry,material,object,group){
  const value=original.call(this,camera,scene,geometry,material,object,group);
  if(renderer.getRenderTarget()===world.destructionPass.smokeDepth){
   rows.push({object:object.uuid,name:object.name,geometry:geometry.uuid,
    drawRange:{...geometry.drawRange},group:group?{...group}:null,
    index:geometry.index?[geometry.index.count,geometry.index.version]:null,
    attributes:Object.fromEntries(Object.entries(geometry.attributes).map(([key,a])=>[key,[a.count,a.version??a.data?.version,a.itemSize]])),
    instances:object.isInstancedMesh?[object.count,object.instanceMatrix.version]:geometry.instanceCount??null,
    matrix:object.matrixWorld.elements.slice(),morph:object.morphTargetInfluences?.slice()??null,
    material:material.id,type:material.type,program:renderer.properties.get(material).currentProgram?.id??null,
    alphaTest:material.alphaTest,opacity:material.opacity,side:material.side,
    map:material.map?[material.map.uuid,material.map.version,material.map.matrix.elements.slice()]:null,
    alphaMap:material.alphaMap?[material.alphaMap.uuid,material.alphaMap.version]:null});
  }
  return value;
 };
 try{render();return rows;}finally{renderer.renderBufferDirect=original;}
}

export function compareDepthSubmissionState(a,b){
 const differences=[];
 for(let i=0;i<Math.max(a.length,b.length);i++)if(JSON.stringify(a[i])!==JSON.stringify(b[i])){
  const left=a[i],right=b[i],keys=[...new Set([...Object.keys(left??{}),...Object.keys(right??{})])];
  if(differences.length<8)differences.push({draw:i,left:left?.name??null,right:right?.name??null,changed:keys.filter(k=>JSON.stringify(left?.[k])!==JSON.stringify(right?.[k]))});
 }
 return {same:a.length===b.length&&differences.length===0,leftDraws:a.length,rightDraws:b.length,firstDifferences:differences};
}
