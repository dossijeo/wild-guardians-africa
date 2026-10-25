import * as THREE from 'three';
import {applyMaterialStudy as createGrass} from './qa-grass-fine-lite.js';
export async function applyMaterialStudy(world){
 const audit=await createGrass(world);if(audit.control)return audit;
 const d=world.groundDetails,original=d.material;
 const diffuse=new THREE.MeshLambertMaterial({color:original.color.clone(),vertexColors:true,side:THREE.FrontSide});
 d.material=d.mesh.material=diffuse;
 world.qaGrassMaterials={original,diffuse};
 return {...audit,material:'Three Lambert, original vertex colors, native scene lights and standard shadow receiver',limitation:'Different lighting recipe; visual validation required, no runtime integration'};
}
