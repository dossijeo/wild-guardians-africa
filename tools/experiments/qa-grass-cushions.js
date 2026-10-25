import * as THREE from 'three';
import {BlenderGroundDetails} from '/src/rendering/blender-ground-details.js';
import {applyGroundShadeCoherence as applyFill} from './qa-ground-shadow-fill.js';
export async function applyGroundShadeCoherence(world){
 applyFill(world);
 if(world.state.biome!=='sabana')return {control:true};
 const gltf=await world.assets.model('/assets/visual-lab/grass-cushion.glb');
 gltf.scene.updateMatrixWorld(true);let source;gltf.scene.traverse(o=>{if(o.isMesh&&!source)source=o});
 const d=new BlenderGroundDetails(world.assets,world.scene,'savanna');
 Object.assign(d,{enabled:true,global:true,sculpted:true,detailed:true});
 d.geometry=source.geometry.clone().applyMatrix4(source.matrixWorld);d.material=source.material.clone();
 d.material.side=THREE.FrontSide;d.material.roughness=.96;
 d.mesh=new THREE.InstancedMesh(d.geometry,d.material,1);d.mesh.name='visual-lab-grass-cushion';d.mesh.count=0;d.mesh.receiveShadow=true;d.mesh.frustumCulled=false;world.scene.add(d.mesh);
 // Existing density, occupancy exclusions and stable seed; scale the authored
 // cushion directly rather than scaling up every blade of the earlier pilot.
 const rebuild=d.rebuild.bind(d);d.rebuild=()=>{rebuild();const m=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();for(let i=0;i<d.mesh.count;i++){d.mesh.getMatrixAt(i,m);m.decompose(p,q,s);s.multiplyScalar(.34);m.compose(p,q,s);d.mesh.setMatrixAt(i,m)}d.mesh.instanceMatrix.needsUpdate=true;};
 world.groundDetails.dispose();world.groundDetails=d;world.visualLabGroundDetails=true;
 for(const key of world.chunks.keys()){const [cx,cz]=key.split(',').map(Number);d.chunk(cx,cz,world.nav.field,world.state);}
 return {instances:d.count,trianglesPerInstance:(d.geometry.index?.count??d.geometry.attributes.position.count)/3,newTextures:0,originalModelsUntouched:true};
}
