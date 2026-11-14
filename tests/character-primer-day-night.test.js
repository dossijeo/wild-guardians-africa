import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,Group,Mesh,MeshBasicMaterial,Scene,Vector4} from 'three';
import {comparePrimerDayNight} from '../tools/experiments/character-primer-day-night.js';

test('day/night audit compares every program even when meshes and materials have identical names',()=>{
 const scene=new Scene(),root=new Group();root.userData.qaPrimerLabel='hyena:lod';scene.add(root);
 const a=new Mesh(new BoxGeometry(),new MeshBasicMaterial()),b=new Mesh(new BoxGeometry(),new MeshBasicMaterial());a.name=b.name='body';a.material.name=b.material.name='skin';root.add(a,b);
 const props=new WeakMap(),gl={},camera={},toon={uniforms:{uNight:{value:.25}}},sun={intensity:2},ambient={intensity:1};let viewport=new Vector4(0,0,640,480),scissor=viewport.clone(),testScissor=false;
 const renderer={shadowMap:{autoUpdate:true,needsUpdate:false},autoClear:true,getContext:()=>gl,properties:{get(material){if(!props.has(material))props.set(material,{});return props.get(material);}},getViewport:v=>v.copy(viewport),getScissor:v=>v.copy(scissor),getScissorTest:()=>testScissor,setViewport(...v){viewport=v[0]?.isVector4?v[0].clone():new Vector4(...v);},setScissor(...v){scissor=v[0]?.isVector4?v[0].clone():new Vector4(...v);},setScissorTest:v=>testScissor=v,getRenderTarget:()=>null,setRenderTarget(){},render(){for(const mesh of [a,b]){renderer.properties.get(mesh.material).currentProgram={cacheKey:mesh===a&&toon.uniforms.uNight.value===1?'night':'same'};mesh.onAfterRender(renderer,scene,camera,mesh.geometry,mesh.material,null);}}};
 const beforeA=a.onAfterRender,beforeB=b.onAfterRender,result=comparePrimerDayNight({renderer,scene,toon,sun,ambient},root,camera);
 assert.equal(result.programDifferences.length,1);assert.deepEqual(result.missingPrograms,[]);assert.deepEqual(result.draws,{day:2,night:2});assert.equal(toon.uniforms.uNight.value,.25);assert.equal(sun.intensity,2);assert.equal(ambient.intensity,1);assert.equal(a.onAfterRender,beforeA);assert.equal(b.onAfterRender,beforeB);assert.equal(renderer.shadowMap.autoUpdate,true);
});
