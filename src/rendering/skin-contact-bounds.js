import {Matrix4,Vector3} from 'three';
import {isTailContactVertex} from './beast-ground-contact.js';
// Exact linear-blend skin envelope. Matrices are prepared once per pose rather
// than rebuilt by getVertexPosition for every vertex. Includes active morphs.
export class SkinContactBounds {
 constructor(model){
  this.matrix=new Matrix4();this.post=new Matrix4();this.point=new Vector3();this.meshes=[];
  model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const indices=[],seen=new Set(),g=mesh.geometry.attributes,attributes=[g.position,g.skinIndex,g.skinWeight,...(mesh.geometry.morphAttributes.position??[])];
   // UV/normal seams duplicate skin vertices. Only merge exact deformation
   // inputs, including every position morph, so no shape coverage is lost.
   for(let i=0;i<g.position.count;i++){if(isTailContactVertex(mesh,i))continue;let key='';for(const a of attributes)for(let k=0;k<a.itemSize;k++)key+=a.getComponent(i,k)+',';if(!seen.has(key)){seen.add(key);indices.push(i);}}
   this.meshes.push({mesh,indices,activeMorphs:[],matrices:new Float64Array(mesh.skeleton.bones.length*16)});
  });
 }
 expand(bounds){
  for(const {mesh,indices,matrices,activeMorphs}of this.meshes){
   activeMorphs.length=0;const morphs=mesh.geometry.morphAttributes.position??[],influences=mesh.morphTargetInfluences??[];for(let m=0;m<morphs.length;m++)if(influences[m])activeMorphs.push(m);
   const skeleton=mesh.skeleton,g=mesh.geometry.attributes,p=g.position,joints=g.skinIndex,weights=g.skinWeight;
   for(let b=0;b<skeleton.bones.length;b++)this.matrix.multiplyMatrices(skeleton.bones[b].matrixWorld,skeleton.boneInverses[b]).multiply(mesh.bindMatrix).toArray(matrices,b*16);
   this.post.multiplyMatrices(mesh.matrixWorld,mesh.bindMatrixInverse);const e=this.post.elements;
   for(const i of indices){
    const bx=p.getX(i),by=p.getY(i),bz=p.getZ(i);let x=bx,y=by,z=bz;
    for(const m of activeMorphs){const a=morphs[m],w=influences[m],relative=mesh.geometry.morphTargetsRelative;x+=w*(a.getX(i)-(relative?0:bx));y+=w*(a.getY(i)-(relative?0:by));z+=w*(a.getZ(i)-(relative?0:bz));}
    let sx=0,sy=0,sz=0;
    for(let k=0;k<4;k++){const w=weights.getComponent(i,k);if(!w)continue;const o=joints.getComponent(i,k)*16;
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
