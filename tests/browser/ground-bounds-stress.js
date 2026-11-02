import {Group,Matrix4} from 'three';
import {applyAnimalPose} from '../../src/rendering/animal-actions.js';
import {releaseActorRig} from '../../src/rendering/animal-preload.js';
import {prepareGroundBounds,calculateGroundBounds} from './ground-bounds-prototype.js';
export async function audit(world){
 const rows=[];
 for(const species of ['warthog','hyena','buffalo','lion','rhino']){
  const entry=await world.animalPreload.warm(species),rig=world.animalPreload.create(species,entry),parent=new Group();parent.add(rig.model);
  try{
   const prepared=prepareGroundBounds(rig.groundSamples),mesh=prepared.meshes[0].mesh,original=mesh.getVertexPosition,bones=mesh.skeleton.bones,inv=new Matrix4(),relative=new Matrix4();let skipped=0,morphChecks=0,customChecks=0;
   for(let i=0;i<100;i++){
    const t=i*.047;applyAnimalPose(rig,{species,status:i%2?'entering':'moving',motionPhase:t},t);
    for(let j=0;j<Math.min(4,bones.length);j++)bones[(j*7+i)%bones.length].rotation.x+=.18*Math.sin(i+j);
    parent.position.set(i%3===0?10000:2,3,i%3===0?-10000:-4);parent.rotation.set(.1*Math.sin(i),.4*Math.cos(i),.12*Math.sin(i*.7));parent.scale.set(1+.05*Math.cos(i),1.1,.9);
    let morph=null,oldMorph;if(i%5===0&&mesh.morphTargetInfluences?.length){morph=mesh.morphTargetInfluences;oldMorph=morph[0];morph[0]=.5;morphChecks++;}
    const custom=i%7===0;if(custom){mesh.getVertexPosition=function(index,target){return original.call(this,index,target);};customChecks++;}
    rig.model.position.y=0;parent.updateMatrixWorld(true);inv.copy(parent.matrixWorld).invert();const toRoot=m=>relative.multiplyMatrices(inv,m.matrixWorld);
    const reference=calculateGroundBounds(prepared,toRoot,false),candidate=calculateGroundBounds(prepared,toRoot,true);
    if(!Number.isFinite(reference.min)||reference.min!==candidate.min)throw Error(`${species} sample ${i}: ${reference.min} != ${candidate.min}`);
    if((morph||custom)&&candidate.skipped!==0)throw Error('Fallback did not perform full scan');skipped+=candidate.skipped;
    if(morph)morph[0]=oldMorph;if(custom)mesh.getVertexPosition=original;
   }
   rows.push({species,cases:100,morphChecks,customChecks,skipped,equal:true});
  }finally{releaseActorRig(rig);}
 }
 return rows;
}
