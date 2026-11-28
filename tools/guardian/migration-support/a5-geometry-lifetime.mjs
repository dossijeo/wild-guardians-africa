// Promotes Sol's native-farm-terminal-game geometry experiment into a reusable
// probe. Uses Three r180's actual managers; the recording backend is NOT a GPU.
import {BufferGeometry,Float32BufferAttribute,Mesh,MeshBasicMaterial,Scene,Camera} from 'three';
import Geometries from '../../../node_modules/three/src/renderers/common/Geometries.js';
import Attributes from '../../../node_modules/three/src/renderers/common/Attributes.js';
import RenderObject from '../../../node_modules/three/src/renderers/common/RenderObject.js';
import {cloneChunkGeometry} from '../../../src/rendering/webgpu-chunk-clip.js';

export function probeGeometryLifetime(kind){
  if(!['deep-clone','shared-attribute','shared-attribute-stripped-before-dispose','cpu-array-shared-private-attributes'].includes(kind))throw Error('Unknown ownership probe');
  const live=new Set(),calls=[];
  const backend={createAttribute(a){live.add(a);calls.push('create');},createIndexAttribute(a){live.add(a);calls.push('createIndex');},destroyAttribute(a){live.delete(a);calls.push('destroy');}};
  const attributes=new Attributes(backend),info={memory:{geometries:0},render:{calls:1}},manager=new Geometries(attributes,info);
  const source=new BufferGeometry().setAttribute('position',new Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));source.setIndex([0,1,2]);
  const candidate=kind==='deep-clone'?source.clone():kind==='cpu-array-shared-private-attributes'?cloneChunkGeometry(source):new BufferGeometry().setAttribute('position',source.attributes.position).setIndex(source.index);
  const cpuArrayShared=source.attributes.position.array===candidate.attributes.position.array;
  const object=geometry=>{const material=new MeshBasicMaterial(),mesh=new Mesh(geometry,material);return new RenderObject({getCacheKey:()=>0,getForRender:()=>({nodeAttributes:[{name:'position'}]})},manager,{backend},mesh,material,new Scene(),new Camera(),null,{},null);};
  try{
    const a=object(source),b=object(candidate);manager.updateForRender(a);manager.updateForRender(b);
    const creates=()=>calls.filter(c=>c.startsWith('create')).length,initialCreates=creates();
    // Exercise the real constructor's disposal listener, not a prototype double.
    if(kind==='shared-attribute-stripped-before-dispose'){candidate.deleteAttribute('position');candidate.setIndex(null);}
    let disposalError=null;try{candidate.dispose();}catch(error){disposalError=String(error);}
    const sourceBuffersSurviveCandidateDisposal=live.has(source.attributes.position)&&live.has(source.index);
    info.render.calls++;manager.updateForRender(a);
    const row={kind,cpuArrayShared,initialCreates,disposalError,sourceBuffersSurviveCandidateDisposal,createsOnNextRender:creates()-initialCreates};
    source.dispose();row.liveAfterFinalDispose=live.size;
    return {...row,scope:'Actual Three Geometries/Attributes/RenderObject; recording backend, not hardware, not a sharing permission for mutable CPU arrays.'};
  }finally{try{candidate.dispose();}catch{}source.dispose();}
}
