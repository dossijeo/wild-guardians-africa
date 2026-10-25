// Deliberately delayed adoption: correctness/resource accounting, not a benchmark.
export async function verifyCanyonPendingHandoff(w){
 if(new URLSearchParams(location.search).get('horizonHandoff')!=='atomic')throw Error('Atomic handoff required');
 const h=w.horizon,eye=w.camera.position.clone(),target=w.controls.target.clone(),original=h.canAdopt;
 const frame=()=>new Promise(requestAnimationFrame);
 const wait=async predicate=>{const end=performance.now()+60000;while(!predicate()){if(performance.now()>end)throw Error('Canyon pending lifecycle timeout');await frame();}};
 const bytes=()=>{const buffers=new Set();w.scene.traverse(o=>{const g=o.geometry;if(!g)return;for(const a of [...Object.values(g.attributes),g.index].filter(Boolean))buffers.add((a.array??a.data?.array).buffer);});return [...buffers].reduce((n,b)=>n+b.byteLength,0);};
 const snapshot=()=>({chunks:w.chunks.size,sceneGeometryBackingBytes:bytes(),pendingTerrainBytes:h.pendingAdoption?.data.terrain.byteLength??0,pendingWaterBytes:h.pendingAdoption?.data.water.byteLength??0});
 w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};if(w.raidCamera)w.raidCamera.update=()=>{};
 await wait(()=>!w.chunkStream.summary().busy&&!w.chunkStream.summary().queued&&!h.generator.latest&&!h.generator.busy&&!h.pendingPreparation&&!h.pendingAdoption);
 const before=snapshot(),oldGroup=h.group,oldRegion=JSON.stringify(h.region);
 const move=z=>{w.camera.position.copy(eye);w.controls.target.copy(target);w.camera.position.z+=z;w.controls.target.z+=z;};
 let exiting=false,lateInstalls=0;const install=w.installChunk;w.installChunk=function(...args){if(exiting)lateInstalls++;return install.apply(this,args);};
 try{
  h.canAdopt=()=>false;move(48);await wait(()=>!!h.pendingAdoption);
  await wait(()=>!w.chunkStream.summary().busy&&!w.chunkStream.summary().queued&&[...w.chunkStream.desired.keys()].every(key=>w.chunks.has(key)));
  const held=snapshot();if(h.group!==oldGroup||JSON.stringify(h.region)!==oldRegion)throw Error('Horizon published before permission');
  const obsolete=h.pendingAdoption.data;move(0);await wait(()=>!h.pendingAdoption&&!h.generator.latest&&!h.generator.busy);
  if(h.group!==oldGroup)throw Error('Reversed destination replaced original horizon');
  h.canAdopt=original;move(48);await wait(()=>JSON.stringify(h.region)!==oldRegion&&!h.pendingAdoption&&!w.chunkStream.summary().busy&&!w.chunkStream.summary().queued);
  const adopted=snapshot();if(h.group.children[0].geometry.attributes.position.array===obsolete.terrain)throw Error('Obsolete worker data reused');
  h.canAdopt=()=>false;move(96);await wait(()=>!!h.pendingAdoption);const atExit=snapshot();
  exiting=true;await globalThis.qaReturnToMenu();await new Promise(r=>setTimeout(r,250));
  if(!w.disposed||h.pendingAdoption||h.pendingPreparation||h.group||!h.generator.dead||lateInstalls||!document.querySelector('#native-menu'))throw Error('Pending horizon survived exit');
  return {scope:'Frozen simulation, injected adoption delay; backing-array bytes are not GPU residency or peak driver allocation.',before,held,adopted,atExit,reversalDiscarded:true,worldDisposed:w.disposed,pendingReleased:!h.pendingAdoption,lateInstalls,menu:true};
 }finally{h.canAdopt=original;w.installChunk=install;}
}
