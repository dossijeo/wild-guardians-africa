import * as T from 'three';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';

// Geometry-only test rig, usable without DOM or image decoding in a Worker.
export async function loadTestRig(species){
 const response=await fetch(ANIMAL_ACTIONS.animals[species].url);if(!response.ok)throw Error(`Rig fetch: ${response.status}`);
 const bytes=await response.arrayBuffer(),view=new DataView(bytes),jsonSize=view.getUint32(12,true),g=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,jsonSize))),binOffset=28+jsonSize;
 const types={5126:[Float32Array,4,'getFloat32'],5123:[Uint16Array,2,'getUint16'],5121:[Uint8Array,1,'getUint8'],5125:[Uint32Array,4,'getUint32']},sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
 function accessor(index){const a=g.accessors[index],v=g.bufferViews[a.bufferView],[Type,width,read]=types[a.componentType],size=sizes[a.type],out=new Type(a.count*size);for(let i=0;i<a.count;i++)for(let k=0;k<size;k++)out[i*size+k]=view[read](binOffset+(v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??size*width)+k*width,true);return new T.BufferAttribute(out,size,!!a.normalized);}
 const jointIds=new Set(g.skins.flatMap(s=>s.joints)),nodes=g.nodes.map((n,i)=>{const o=jointIds.has(i)?new T.Bone():new T.Group();o.name=n.name??'';if(n.matrix){o.matrix.fromArray(n.matrix);o.matrix.decompose(o.position,o.quaternion,o.scale);}else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);}return o;});
 for(let i=0;i<nodes.length;i++)for(const j of g.nodes[i].children??[])nodes[i].add(nodes[j]);const root=new T.Group();for(const i of g.scenes[g.scene??0].nodes)root.add(nodes[i]);root.updateMatrixWorld(true);
 for(let i=0;i<nodes.length;i++){const n=g.nodes[i];if(n.mesh===undefined||n.skin===undefined)continue;const s=g.skins[n.skin],ib=accessor(s.inverseBindMatrices).array,skel=new T.Skeleton(s.joints.map(j=>nodes[j]),s.joints.map((_,j)=>new T.Matrix4().fromArray(ib,j*16)));for(const primitive of g.meshes[n.mesh].primitives){const geo=new T.BufferGeometry();for(const [attr,name] of [['POSITION','position'],['JOINTS_0','skinIndex'],['WEIGHTS_0','skinWeight']])geo.setAttribute(name,accessor(primitive.attributes[attr]));const mesh=new T.SkinnedMesh(geo,new T.MeshBasicMaterial());mesh.normalizeSkinWeights();nodes[i].add(mesh);mesh.bind(skel,new T.Matrix4());}}
 root.userData.beastSpecies=species;root.updateMatrixWorld(true);return root;
}
