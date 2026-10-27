import {verifyGameQualityCycle} from './spatial-thread-game-quality-case.js';
import {verifyGameContextRestore} from './spatial-thread-game-context-case.js';

// QA-only read of Three r180 uniforms; renderer retains resource ownership.
function audit(w){
 const rows=[];
 w.scene.traverse(mesh=>{
  if(!mesh.userData.farGround||mesh.userData.farGroundSeam)return;
  const uniforms=w.renderer.properties.get(mesh.material).uniforms;
  const texture=uniforms?.uFarResidentMask?.value;
  if(!texture)throw Error('Far ground has no compiled resident mask');
  const [minX,minZ,maxX,maxZ]=w.nearBounds,cx=Math.round((minX+24)/48),cz=Math.round((minZ+24)/48);
  const pixels=texture.image.data;
  for(let z=0;z<8;z++)for(let x=0;x<8;x++){
   const group=x<Math.ceil((maxX-minX)/48)&&z<Math.ceil((maxZ-minZ)/48)?w.chunks.get(`${cx+x},${cz+z}`):null;
   if(pixels[(z*8+x)*4]!==((group&&group.visible!==false)?255:0))throw Error('Resident mask diverged from visible chunks');
  }
  rows.push({textureId:texture.id,version:texture.version,bytes:pixels.byteLength,residentCells:[...pixels].filter((_,i)=>i%4===0).filter(v=>v===255).length,bounds:[...w.nearBounds]});
 });
 if(!rows.length)throw Error('No far ground found');
 return rows;
}
export async function verifyResidentGroundLifecycle(w){
 const settle=async()=>{const end=performance.now()+90000;let stable=0;while(stable<3){if(performance.now()>end)throw Error('Resident lifecycle settle timeout');await new Promise(requestAnimationFrame);w.render(0);const failures=w.farVegetation.adapters.flatMap(a=>a.stats.errors);if(failures.length)throw Error(failures.join('; '));stable=w.farVegetation.adapters.every(a=>!a.preparationPending())?stable+1:0;}};
 await settle();const before=audit(w);await globalThis.qaCaptureResidentGround?.('before');
 const quality=await verifyGameQualityCycle(w);await settle();const afterQuality=audit(w);await globalThis.qaCaptureResidentGround?.('after-quality');
 const context=await verifyGameContextRestore(w);await settle();const afterContext=audit(w);await globalThis.qaCaptureResidentGround?.('after-context');
 const staleContextNotice=[...document.querySelectorAll('.command-feedback')].some(node=>node.getClientRects().length>0&&getComputedStyle(node).visibility!=='hidden'&&node.textContent.includes('Se ha perdido el contexto gráfico. La partida está pausada.'));if(staleContextNotice)throw Error('Restored context retained obsolete loss notice');
 return {before,afterQuality,afterContext,quality,context,staleContextNotice};
}
