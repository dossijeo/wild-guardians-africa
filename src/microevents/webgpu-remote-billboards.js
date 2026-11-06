import {Group,MeshBasicMaterial,Texture} from 'three';
import {MicroeventBillboards} from './billboards.js';

// Reuse the established particle packing without creating a renderer or loading
// an atlas on the UI thread. The graphical Worker owns the actual mesh/atlas.
export function createRemoteMicroeventBillboards(world,sender){
 if(!world?.state||typeof sender?.prepare!=='function'||typeof sender?.frame!=='function')throw TypeError('Invalid remote microevent billboards');
 const texture=new Texture(),material=new MeshBasicMaterial(),adapter={material,setAtlas(){},setLight(){}},source=new MicroeventBillboards({scene:new Group(),state:world.state},{texture,materialAdapter:adapter});let disposed=false,ready=false,prepared=null;
 function prepare(){if(disposed)return Promise.reject(new DOMException('Microevent preparation cancelled','AbortError'));return prepared??=Promise.all([source.ready,sender.prepare()]).then(()=>{if(disposed)throw new DOMException('Microevent preparation cancelled','AbortError');ready=true;});}
 function publish(glow=false){if(!ready||disposed)return;try{sender.frame({origin:source.root.position.toArray(),light:glow?1:source.world.state?.time>=300?.68:1,instances:source.buffer.array.subarray(0,source.count*15)});}catch{ready=false;}}
 return {get ready(){return prepare();},get count(){return source.count;},draw(particles,space,options){if(disposed)return;source.draw(particles,space,options);publish(!!particles.def.glow);},clear(){if(disposed)return;source.clear();publish();},dispose(){if(disposed)return;source.clear();publish();disposed=true;source.dispose();}};
}
