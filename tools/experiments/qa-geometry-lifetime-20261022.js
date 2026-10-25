import {BufferGeometry} from 'three';

// Diagnostic only: never imported by production or timed benchmarks.
const resident=new Set();
const add=BufferGeometry.prototype.addEventListener;
const remove=BufferGeometry.prototype.removeEventListener;
BufferGeometry.prototype.addEventListener=function(type,listener){
  if(type==='dispose'&&listener.name==='onGeometryDispose')resident.add(this);
  return add.call(this,type,listener);
};
BufferGeometry.prototype.removeEventListener=function(type,listener){
  if(type==='dispose'&&listener.name==='onGeometryDispose')resident.delete(this);
  return remove.call(this,type,listener);
};
globalThis.qaGeometrySnapshot=function(world){
  const owners=new Map();
  for(const [key,value] of Object.entries(world)){
    if(!value?.isObject3D)continue;
    value.traverse(object=>{
      if(!object.geometry)return;
      const paths=owners.get(object.geometry)??[];
      let path=object.name||object.type,parent=object.parent;
      while(parent){path=(parent.name||parent.type)+'/'+path;parent=parent.parent;}
      paths.push({root:key,path,visible:object.visible,position:object.position.toArray()});
      owners.set(object.geometry,paths);
    });
  }
  const geometries=[...resident].map(g=>({name:g.name,type:g.type,
    index:g.index?.count??0,attributes:Object.fromEntries(Object.entries(g.attributes).map(([k,a])=>[k,{count:a.count,itemSize:a.itemSize}])),
    owners:owners.get(g)??[],parameters:g.parameters??null}));
  const count=world.renderer.info.memory.geometries;
  if(count!==geometries.length)throw Error(`Geometry tracking incomplete: ${geometries.length}/${count}`);
  return {count,geometries};
};
