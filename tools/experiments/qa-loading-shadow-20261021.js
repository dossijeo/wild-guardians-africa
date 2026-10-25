import {installNativeShadow} from '../../src/rendering/native-shadow.js';
// QA: use the same growth-aware crop depth materials and native PCF as the game.
export function installLoadingShadow(d){
 // The completed campaign used by this harness has a global asset-proxy hook.
 // Detach it before wrapping native shadows: those proxies do not belong to this
 // presentation. Harness owns the paused session; no return to gameplay here.
 d.world.releaseAssetShadows();
 d.sun.castShadow=true;d.sun.shadow.mapSize.set(512,512);
 Object.assign(d.sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:1,far:100});d.sun.shadow.camera.updateProjectionMatrix();
 d.scene.add(d.sun.target);d.ground.receiveShadow=true;
 d.scene.traverse(mesh=>{if(mesh.isInstancedMesh){mesh.castShadow=true;mesh.receiveShadow=true;}});
 const release=installNativeShadow(d.world.renderer,d.sun,d.toon.shadowUniforms);
 const dispose=d.dispose.bind(d);d.dispose=()=>{release();d.sun.shadow.map?.dispose();dispose();};
 return {cache:release.cache};
}
