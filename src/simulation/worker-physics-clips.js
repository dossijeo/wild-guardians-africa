import {AnimationClip,VectorKeyframeTrack,QuaternionKeyframeTrack,InterpolateDiscrete,InterpolateLinear,PropertyBinding} from 'three';
import {ANIMAL_ACTIONS} from './animal-actions-data.js';
import {prepareAnimalClips} from '../rendering/animal-actions.js';
// Experimental strict GLB animation reader. Reject unsupported formats rather than silently changing clips.
export async function loadWorkerPhysicsClips(species){
 const response=await fetch(ANIMAL_ACTIONS.animals[species].url);if(!response.ok)throw Error('Missing clip GLB');const bytes=await response.arrayBuffer(),view=new DataView(bytes),jsonSize=view.getUint32(12,true),g=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,jsonSize))),bin=28+jsonSize;
 function accessor(index){const a=g.accessors[index],b=g.bufferViews[a?.bufferView],size={SCALAR:1,VEC3:3,VEC4:4}[a?.type];if(!a||!b||a.componentType!==5126||!size||a.sparse||b.buffer!==0||b.extensions)throw Error('Unsupported animation accessor');const data=new Float32Array(a.count*size),step=b.byteStride??size*4;for(let i=0;i<a.count;i++)for(let k=0;k<size;k++)data[i*size+k]=view.getFloat32(bin+(b.byteOffset??0)+(a.byteOffset??0)+i*step+k*4,true);return data;}
 const clips=g.animations.map(animation=>{const tracks=animation.channels.map(channel=>{const sampler=animation.samplers[channel.sampler],node=g.nodes[channel.target.node],property={translation:'position',rotation:'quaternion',scale:'scale'}[channel.target.path],interpolation=sampler.interpolation??'LINEAR';if(!node?.name||!property||!['STEP','LINEAR'].includes(interpolation))throw Error('Unsupported animation channel');const Type=property==='quaternion'?QuaternionKeyframeTrack:VectorKeyframeTrack;return new Type(PropertyBinding.sanitizeNodeName(node.name)+'.'+property,accessor(sampler.input),accessor(sampler.output),interpolation==='STEP'?InterpolateDiscrete:InterpolateLinear);});return new AnimationClip(animation.name,undefined,tracks);});
 return prepareAnimalClips(clips);
}
