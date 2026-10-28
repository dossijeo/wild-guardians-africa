import {createFixture} from './fixtures.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
window.fixtureSmoke={done:false,results:[],errors:[]};
window.fixtureExports={};
try{
  for(const scenario of ['A','B']){
    const start=performance.now(),fixture=await createFixture({scenario,instancing:false});
    const loadMs=performance.now()-start,exportStart=performance.now();
    const bytes=await fixture.exportGLB(),exportMs=performance.now()-exportStart;
    const jsonLength=new DataView(bytes).getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,jsonLength)));
    const reloaded=await new GLTFLoader().parseAsync(bytes,'');
    let triangles=0,meshes=0;reloaded.scene.traverse(mesh=>{if(mesh.isMesh){meshes++;triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3}});
    const originalStatic={meshes:0,triangles:0};fixture.world.traverse(mesh=>{if(mesh.isMesh){originalStatic.meshes++;originalStatic.triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3}});
    if(meshes!==originalStatic.meshes||triangles!==originalStatic.triangles)throw Error(`Static export parity failed ${JSON.stringify({originalStatic,meshes,triangles})}`);
    let maxActorMatrixError=0,bones=0,animatedActors=0;
    fixture.update(2.35);
    for(const actor of fixture.actors){
      const expected=fixture.actorMatrix(actor,2.35),actual=actor.wrapper.children[0].matrixWorld.elements;
      expected.forEach((value,i)=>maxActorMatrixError=Math.max(maxActorMatrixError,Math.abs(value-actual[i])));
      actor.wrapper.traverse(node=>{if(node.isBone)bones++});if(actor.animationCount)animatedActors++;
    }
    if(maxActorMatrixError>1e-5)throw Error(`Actor root transform mismatch ${maxActorMatrixError}`);
    const result={scenario,loadMs,exportMs,bytes:bytes.byteLength,metadata:fixture.metadata,actorDescriptors:fixture.actorDescriptors,camera:{fov:48,aspect:1280/720,near:.2,far:260,position:[58,48,76],target:[0,0,0],motion:'position=[58+sin(t*.6)*12,48+sin(t*.3)*4,68+cos(t*.6)*8];target=[sin(t*.25)*12,0,0]'},partialUpdates:fixture.partialUpdates(0),static:{...originalStatic,reloadedMeshes:meshes,reloadedTriangles:triangles,gltfMeshes:json.meshes.length,gltfNodes:json.nodes.length},actors:{count:fixture.actors.length,animatedActors,bones,maxActorMatrixError},extensions:json.extensionsUsed??[]};
    window.fixtureExports[scenario]=bytes;
    window.fixtureSmoke.results.push(result);fixture.dispose();
  }
}catch(error){window.fixtureSmoke.errors.push(String(error.stack??error))}
window.fixtureSmoke.done=true;document.querySelector('#result').textContent=JSON.stringify(window.fixtureSmoke,null,2);
