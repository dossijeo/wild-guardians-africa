import './webgpu-preparation-stall-worker.js';
import {WebGPURenderer} from 'three/webgpu';

// Observe the actual object transforms consumed by the production renderer.
// No alternate surface, resource owner or drawing path is created here.
const render=WebGPURenderer.prototype.render,send=self.postMessage.bind(self);let lastScene=null,lastPlacements=null;
function placements(scene){const result=[];scene?.traverse(object=>{if(typeof object.userData.entityId!=='string')return;const geometries=[],materials=[];object.updateWorldMatrix(true,true);object.traverse(child=>{if(child.isMesh){geometries.push(child.geometry.id);materials.push(...(Array.isArray(child.material)?child.material:[child.material]).map(material=>material.id));}});result.push({id:object.userData.entityId,object:object.id,position:object.position.toArray(),worldPosition:[object.matrixWorld.elements[12],object.matrixWorld.elements[13],object.matrixWorld.elements[14]],visible:object.visible,geometries:[...new Set(geometries)],materials:[...new Set(materials)]});});return result;}
WebGPURenderer.prototype.render=function(scene,...args){const observed=placements(scene);if(observed.length){lastScene=scene;lastPlacements={at:performance.timeOrigin+performance.now(),entities:observed};}return render.call(this,scene,...args);};
self.postMessage=(message,...args)=>send(message.kind==='inspection'?{...message,qaRecordedPlacements:lastPlacements,qaLivePlacements:placements(lastScene)}:message,...args);
