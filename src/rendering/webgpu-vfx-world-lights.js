import * as THREE from 'three';

// A fixed light set is installed before any world material is admitted. The
// native VFX supply only values; changing sources never changes the scene's
// light count or its pipeline structure.
export function createWebGpuVfxWorldLights({scene,count=4}={}){
 if(!scene?.isScene||!Number.isInteger(count)||count<1||count>8)throw TypeError('Invalid VFX world lights');
 const lights=Array.from({length:count},()=>{const light=new THREE.PointLight(0xffffff,0,0,2);scene.add(light);return light;}),candidates=Array.from({length:count},()=>({score:0,effect:null,index:0})),retained=new Map(),point=new THREE.Vector3(),eye=new THREE.Vector3();let closed=false;
 function update(camera,effects){
  if(closed)return;if(!camera?.isCamera||!Array.isArray(effects))throw TypeError('Invalid VFX light update');camera.updateWorldMatrix(true,false);camera.getWorldPosition(eye);for(const candidate of candidates){candidate.score=0;candidate.effect=null;}
  for(const effect of effects){if(!effect||effect.disposed||effect.family==='agriculture'||!effect.root?.visible||!effect.root.parent||!effect.native?.lights)continue;let parent=effect.root.parent;while(parent&&parent!==scene&&parent.visible)parent=parent.parent;if(parent!==scene||!scene.visible)continue;effect.root.updateWorldMatrix(true,false);const source=effect.native.lights,scale=effect.root.matrixWorld.getMaxScaleOnAxis(),intensity=scale*scale/2.2;for(let index=0;index<2;index++){const position=source.positions[index],color=source.colors[index];if(!position||!color||!color.some(value=>value>0))continue;point.fromArray(position).applyMatrix4(effect.root.matrixWorld);const prior=retained.get(effect),score=(prior?.has(index)?1.2:1)*intensity*Math.max(...color)/(1+point.distanceToSquared(eye));let lowest=candidates[0];for(const item of candidates)if(item.score<lowest.score)lowest=item;if(score>lowest.score)Object.assign(lowest,{score,effect,index});}}
  retained.clear();for(let index=0;index<lights.length;index++){const light=lights[index],candidate=candidates[index],effect=candidate.effect;if(!effect){light.intensity=0;continue;}let prior=retained.get(effect);if(!prior)retained.set(effect,prior=new Set());prior.add(candidate.index);const source=effect.native.lights;light.intensity=effect.root.matrixWorld.getMaxScaleOnAxis()**2/2.2;light.color.fromArray(source.colors[candidate.index]);light.position.fromArray(source.positions[candidate.index]).applyMatrix4(effect.root.matrixWorld);scene.worldToLocal(light.position);}
 }
 return {update,dispose(){if(closed)return;closed=true;retained.clear();for(const light of lights)light.removeFromParent();},get lights(){return lights;}};
}
