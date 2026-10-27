import fs from 'node:fs';
import * as T from 'three';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
// Minimal geometry-only GLB fixture reader: uses actual inverse bind matrices,
// skin weights and vertices, deliberately does not decode textures or animation.
export function beastSkin(species){
 const bytes=fs.readFileSync(new URL('../../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url)),jsonSize=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+jsonSize)),bin=bytes.subarray(28+jsonSize);
 const types={5126:[Float32Array,4,'readFloatLE'],5123:[Uint16Array,2,'readUInt16LE'],5121:[Uint8Array,1,'readUInt8'],5125:[Uint32Array,4,'readUInt32LE']},sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
 function accessor(index){const a=g.accessors[index],v=g.bufferViews[a.bufferView],[Type,width,read]=types[a.componentType],size=sizes[a.type],out=new Type(a.count*size);for(let i=0;i<a.count;i++)for(let k=0;k<size;k++)out[i*size+k]=bin[read]((v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??size*width)+k*width);return new T.BufferAttribute(out,size,!!a.normalized);}
 const jointIds=new Set(g.skins.flatMap(s=>s.joints));const nodes=g.nodes.map((n,i)=>{const o=jointIds.has(i)?new T.Bone():new T.Group();o.name=n.name??'';if(n.matrix){o.matrix.fromArray(n.matrix);o.matrix.decompose(o.position,o.quaternion,o.scale);}else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);}return o;});
 for(let i=0;i<nodes.length;i++)for(const j of g.nodes[i].children??[])nodes[i].add(nodes[j]);const root=new T.Group();for(const i of g.scenes[g.scene??0].nodes)root.add(nodes[i]);root.updateMatrixWorld(true);
 for(let i=0;i<nodes.length;i++){const n=g.nodes[i];if(n.mesh===undefined||n.skin===undefined)continue;const s=g.skins[n.skin],ib=accessor(s.inverseBindMatrices).array,skel=new T.Skeleton(s.joints.map(j=>nodes[j]),s.joints.map((_,j)=>new T.Matrix4().fromArray(ib,j*16)));for(const primitive of g.meshes[n.mesh].primitives){const geo=new T.BufferGeometry();for(const [attr,name] of [['POSITION','position'],['JOINTS_0','skinIndex'],['WEIGHTS_0','skinWeight']])geo.setAttribute(name,accessor(primitive.attributes[attr]));const mesh=new T.SkinnedMesh(geo,new T.MeshBasicMaterial());nodes[i].add(mesh);mesh.bind(skel,new T.Matrix4());}}
 root.updateMatrixWorld(true);return root;
}
