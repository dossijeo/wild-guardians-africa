import {prepareNaturalWaterBed} from '/src/rendering/natural-water-edges.js';
import {prepareChunkWaterBed} from '/tools/experiments/chunk-water-bed-candidate.js';
import {pause} from '/src/simulation/game.js';
export async function inspectLiveWaterBed(w){
 const choices=[];for(const [key,group]of w.chunks){const [cx,cz]=key.split(',').map(Number);group.traverse(mesh=>{if(mesh.userData.nativeFluid==='chunk'&&mesh.geometry.userData.naturalWaterBed)choices.push({key,cx,cz,group,mesh,d:(cx*48-w.controls.target.x)**2+(cz*48-w.controls.target.z)**2});});}
 choices.sort((a,b)=>a.d-b.d);const choice=choices[0];if(!choice)throw Error('No resident chunk water with a natural bed');
 pause(w.state,'qa-water-visual');const {cx,cz,mesh,key}=choice;
 const expected=prepareNaturalWaterBed(w,mesh.geometry,cx,cz,{yielding:false}).next().value;
 const steps=prepareChunkWaterBed(w,mesh.geometry,cx,cz);let step,yields=0;try{while(!(step=steps.next()).done){yields++;await new Promise(requestAnimationFrame);}}finally{steps.return();}
 const actual=step.value;for(const name of ['nx','nz','minX','minZ','width','height','lo','span'])if(actual[name]!==expected[name])throw Error('Bed metadata mismatch '+name);
 if(actual.bytes.length!==expected.bytes.length)throw Error('Bed length mismatch');let changed=0;for(let i=0;i<actual.bytes.length;i++)if(actual.bytes[i]!==expected.bytes[i])changed++;if(changed)throw Error('Bed byte mismatch '+changed);
 mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox,x=(box.min.x+box.max.x)/2+cx*48,z=(box.min.z+box.max.z)/2+cz*48,y=(box.min.y+box.max.y)/2;
 w.cinematic=true;w.controls.target.set(x,y,z);w.camera.position.set(x+30,y+27,z+36);w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld(true);
 for(let i=0;i<60;i++)await new Promise(requestAnimationFrame);
 return {key,yields,changedBytes:changed,bytes:actual.bytes.length,width:actual.nx,height:actual.nz,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),resident:w.chunks.get(key)===choice.group,scope:'Same live geometry/field yields identical metadata and packed bytes. Simulation paused only for this post-benchmark visual inspection. Screenshot is candidate bank view, not independent old/new pixel comparison.'};
}
