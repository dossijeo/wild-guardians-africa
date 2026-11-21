import fs from 'node:fs';import path from 'node:path';import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {actorAsset} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
// Experimental geometry only. Keep every original transform, bone and clip.
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});}readAsDataURL(b){b.arrayBuffer().then(v=>{this.result='data:'+b.type+';base64,'+Buffer.from(v).toString('base64');this.onloadend?.();});}};
const outDir='tests/fixtures/animal-cost';fs.mkdirSync(outDir,{recursive:true});const report=[];
for(const species of Object.keys(ANIMAL_ACTIONS.animals)){
 const original='public'+ANIMAL_ACTIONS.animals[species].url,{scene,animations}=await actorAsset(original);scene.updateMatrixWorld(true);
 const meshes=[];scene.traverse(o=>{if(o.isMesh)meshes.push(o);});const bones=[];scene.traverse(o=>{if(o.isBone)bones.push(o);});const inverseRoot=scene.matrixWorld.clone().invert(),point=new T.Vector3(),groups=new Map();let originalTriangles=0;
 for(const mesh of meshes){const g=mesh.geometry;originalTriangles+=(g.index?.count??g.attributes.position.count)/3;if(!mesh.isSkinnedMesh)continue;
  const si=g.attributes.skinIndex,sw=g.attributes.skinWeight;for(let i=0;i<g.attributes.position.count;i++){let k=0;for(let j=1;j<4;j++)if(sw.getComponent(i,j)>sw.getComponent(i,k))k=j;const bone=mesh.skeleton.bones[si.getComponent(i,k)];let group=groups.get(bone);if(!group){group={bone,count:0,box:new T.Box3(),inverse:bone.matrixWorld.clone().invert()};groups.set(bone,group);}mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld).applyMatrix4(group.inverse);group.box.expandByPoint(point);group.count++;}
 }
 // Largest occupied skin regions exclude tiny facial/ornamental islands.
 const selected=[...groups.values()].sort((a,b)=>b.count-a.count).slice(0,16),positions=[],indices=[],skinIndices=[],weights=[];const center=new T.Vector3(),extent=new T.Vector3();
 for(const g of selected){g.box.getCenter(center);g.box.getSize(extent);const start=positions.length/3,id=bones.indexOf(g.bone);for(let ring=0;ring<2;ring++)for(let j=0;j<8;j++){const a=j*Math.PI/4;point.set(center.x+Math.cos(a)*extent.x*.5,center.y+(ring-.5)*extent.y,center.z+Math.sin(a)*extent.z*.5).applyMatrix4(g.bone.matrixWorld).applyMatrix4(inverseRoot);positions.push(...point);skinIndices.push(id,0,0,0);weights.push(1,0,0,0);}
 for(let j=0;j<8;j++){const n=(j+1)%8;indices.push(start+j,start+n,start+8+n,start+j,start+8+n,start+8+j);}for(let j=1;j<7;j++){indices.push(start,start+j+1,start+j);indices.push(start+8,start+8+j,start+8+j+1);}
 }
 for(const mesh of meshes){mesh.geometry.dispose();mesh.removeFromParent();}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new T.SkinnedMesh(geometry,new T.MeshStandardMaterial({color:0x8b7964,roughness:1,metalness:0}));mesh.name='Experimental_'+species;scene.add(mesh);scene.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones,bones.map(b=>b.matrixWorld.clone().invert()));mesh.bind(skeleton,scene.matrixWorld);mesh.frustumCulled=false;
 // Original facial morph channels have no experimental surface to drive.
 const clips=animations.map(c=>new T.AnimationClip(c.name,c.duration,c.tracks.filter(t=>!t.name.includes('morphTargetInfluences')).map(t=>t.clone())));
 const bytes=await new GLTFExporter().parseAsync(scene,{binary:true,animations:clips,onlyVisible:false});const file=path.join(outDir,species+'-ultralight.glb');fs.writeFileSync(file,Buffer.from(bytes));report.push({species,original,originalTriangles,triangles:indices.length/3,bones:bones.length,regions:selected.map(g=>g.bone.name),clips:clips.length,bytes:bytes.byteLength,file});
}
fs.writeFileSync(path.join(outDir,'inventory.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
