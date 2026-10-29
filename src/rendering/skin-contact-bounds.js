import {Matrix4,Vector3} from 'three';
import {skinContactIndices} from './skin-contact-indices.js';
// The index list is versioned by skinContactIndices. Share decoded immutable
// attributes across recovery instances; keep double precision for normalized weights.
const inputs=new WeakMap(),inputNames=['position','skinWeight','skinIndex'];
const version=a=>a?.isInterleavedBufferAttribute?a.data.version:a?.version;
function refreshInputs(entry){
 const g=entry.mesh.geometry.attributes;
 if(entry.attributes&&inputNames.every((name,i)=>g[name]===entry.attributes[i]&&version(g[name])===entry.versions[i]))return;
 entry.indices=skinContactIndices(entry.mesh);entry.inputs=contactInputs(entry.mesh,entry.indices);entry.attributes=inputNames.map(name=>g[name]);entry.versions=entry.attributes.map(version);
}
function contactInputs(mesh,indices){
 let packed=inputs.get(indices);if(packed)return packed;
 const g=mesh.geometry.attributes,positions=new Float64Array(indices.length*3),weights=new Float64Array(indices.length*4),joints=new Uint32Array(indices.length*4);
 for(let n=0;n<indices.length;n++){const i=indices[n];for(let k=0;k<3;k++)positions[n*3+k]=g.position.getComponent(i,k);for(let k=0;k<4;k++){weights[n*4+k]=g.skinWeight.getComponent(i,k);joints[n*4+k]=g.skinIndex.getComponent(i,k)*16;}}
 packed={positions,weights,joints};inputs.set(indices,packed);return packed;
}
// Exact linear-blend skin envelope. Matrices are prepared once per pose rather
// than rebuilt by getVertexPosition for every vertex. Includes active morphs.
export class SkinContactBounds {
 static prewarm(model){model.traverse(mesh=>{if(mesh.isSkinnedMesh)skinContactIndices(mesh);});}
 constructor(model){
  this.matrix=new Matrix4();this.post=new Matrix4();this.point=new Vector3();this.meshes=[];
  model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const indices=skinContactIndices(mesh);
   const entry={mesh,indices,activeMorphs:[],matrices:new Float64Array(mesh.skeleton.bones.length*16)};refreshInputs(entry);this.meshes.push(entry);
  });
 }
 expand(bounds){
  for(const entry of this.meshes){
   refreshInputs(entry);const {mesh,indices,inputs,matrices,activeMorphs}=entry;
   activeMorphs.length=0;const morphs=mesh.geometry.morphAttributes.position??[],influences=mesh.morphTargetInfluences??[];for(let m=0;m<morphs.length;m++)if(influences[m])activeMorphs.push(m);
   const skeleton=mesh.skeleton,{positions,joints,weights}=inputs;
   for(let b=0;b<skeleton.bones.length;b++)this.matrix.multiplyMatrices(skeleton.bones[b].matrixWorld,skeleton.boneInverses[b]).multiply(mesh.bindMatrix).toArray(matrices,b*16);
   this.post.multiplyMatrices(mesh.matrixWorld,mesh.bindMatrixInverse);const e=this.post.elements;
   for(let n=0;n<indices.length;n++){const i=indices[n];
    const bx=positions[n*3],by=positions[n*3+1],bz=positions[n*3+2];let x=bx,y=by,z=bz;
    for(const m of activeMorphs){const a=morphs[m],w=influences[m],relative=mesh.geometry.morphTargetsRelative;x+=w*(a.getX(i)-(relative?0:bx));y+=w*(a.getY(i)-(relative?0:by));z+=w*(a.getZ(i)-(relative?0:bz));}
    let sx=0,sy=0,sz=0;
    for(let k=0;k<4;k++){const w=weights[n*4+k];if(!w)continue;const o=joints[n*4+k];
     sx+=w*(matrices[o]*x+matrices[o+4]*y+matrices[o+8]*z+matrices[o+12]);
     sy+=w*(matrices[o+1]*x+matrices[o+5]*y+matrices[o+9]*z+matrices[o+13]);
     sz+=w*(matrices[o+2]*x+matrices[o+6]*y+matrices[o+10]*z+matrices[o+14]);
    }
    this.point.set(e[0]*sx+e[4]*sy+e[8]*sz+e[12],e[1]*sx+e[5]*sy+e[9]*sz+e[13],e[2]*sx+e[6]*sy+e[10]*sz+e[14]);bounds.expandByPoint(this.point);
   }
  }
  return bounds;
 }
}
