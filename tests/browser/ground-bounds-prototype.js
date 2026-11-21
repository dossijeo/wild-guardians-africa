// Research-only prototype: immutable test rigs, positive single-bone samples.
// Not safe for production: no mutation/version tracking or complete rounding proof.
import {Vector3} from 'three';
import {GroundSkinSampler} from '../../src/rendering/ground-skin-sampler.js';
export function prepareGroundBounds(samples){
 const meshes=new Map(),v=new Vector3();
 for(const {mesh,index} of samples){let m=meshes.get(mesh);if(!m){const a=mesh.geometry.attributes;m={mesh,all:[],candidates:new Map(),geometry:mesh.geometry,attributes:[a.position,a.skinIndex,a.skinWeight],arrays:[a.position.array,a.skinIndex.array,a.skinWeight.array],versions:[a.position.version,a.skinIndex.version,a.skinWeight.version],bind:mesh.bindMatrix.elements.slice()};meshes.set(mesh,m);}m.all.push(index);
  const a=mesh.geometry.attributes;let bone=-1,valid=true;for(let k=0;k<4;k++){const weight=a.skinWeight.getComponent(index,k);if(weight!==0){if(weight!==1||bone!==-1){valid=false;break;}bone=a.skinIndex.getComponent(index,k);}}
  if(!valid||bone<0)continue;let group=m.candidates.get(bone);if(!group){group={bone,indices:[],min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};m.candidates.set(bone,group);}group.indices.push(index);v.fromBufferAttribute(a.position,index).applyMatrix4(mesh.bindMatrix);for(let j=0;j<3;j++){const n=v.getComponent(j);group.min[j]=Math.min(group.min[j],n);group.max[j]=Math.max(group.max[j],n);}
 }
 for(const m of meshes.values()){m.groups=[...m.candidates.values()].filter(g=>g.indices.length>=16);const members=new Set(m.groups.flatMap(g=>g.indices));m.remaining=m.all.filter(i=>!members.has(i));delete m.candidates;}
 return {meshes:[...meshes.values()],sampler:new GroundSkinSampler()};
}
function validBounds(m){
 const a=m.mesh.geometry.attributes,attrs=[a.position,a.skinIndex,a.skinWeight];
 return m.mesh.geometry===m.geometry&&attrs.every((x,i)=>x===m.attributes[i]&&x?.array===m.arrays[i]&&x.version===m.versions[i])&&m.bind.every((v,i)=>Object.is(v,m.mesh.bindMatrix.elements[i]));
}
export function calculateGroundBounds(prepared,meshToRoot,candidate){
 let min=Infinity,skipped=0,visited=0,groups=0;const s=prepared.sampler;
 for(const m of prepared.meshes){s.bind(m.mesh,meshToRoot(m.mesh));
  // Morph and custom skinning are unsupported by static bounds.
  if(!candidate||!s.fast||!validBounds(m)||m.mesh.morphTargetInfluences?.some(x=>x!==0)){for(const i of m.all){min=Math.min(min,s.height(i));visited++;}continue;}
  for(const i of m.remaining){min=Math.min(min,s.height(i));visited++;}
  for(const g of m.groups){const k=g.bone*4,r=s.rows;let bound=s.offset+r[k+3];for(let j=0;j<3;j++){const c=r[k+j];bound+=c*(c>=0?g.min[j]:g.max[j]);}
   const margin=1e-7*(1+Math.abs(bound));if(Number.isFinite(bound)&&bound-margin>min){skipped+=g.indices.length;groups++;continue;}
   for(const i of g.indices){min=Math.min(min,s.height(i));visited++;}
  }
 }
 return {min,visited,skipped,groups};
}
