import assert from 'node:assert/strict';
export function regionalTailProbe(source,name){
 const replace=(a,b)=>{assert(source.includes(a),'Missing probe anchor '+name+': '+a);source=source.replace(a,b);};
 if(name==='far-scene-loader.js'){
  replace('worker=workerFactory();',"worker=globalThis.qaTailMeasure('worker-create',()=>workerFactory());");
  replace('worker.postMessage(request);',"globalThis.qaTailMeasure('worker-post-message',()=>worker.postMessage(request));");
  replace('worker.terminate();',"globalThis.qaTailMeasure('worker-terminate',()=>worker.terminate());");
  replace('worker.onmessage=({data})=>finish(data.error?new Error(data.error):null,data);',"worker.onmessage=event=>globalThis.qaTailMeasure('worker-receiver',()=>{const data=globalThis.qaTailMeasure('worker-event-data',()=>event.data);return finish(data.error?new Error(data.error):null,data);});");
 }else if(name==='native-far-layer.js'){
  replace('this.onPrepare=onPrepare;',"this.onPrepare=span=>{globalThis.qaTailSpan(span);onPrepare?.(span);};");
  replace('const trees=this.selectTrees(result.data.trees).map(tree=>treeAtlasAnchor(tree,this.metadata.localBase));',"const trees=globalThis.qaTailMeasure('far-select-anchor',()=>this.selectTrees(result.data.trees).map(tree=>treeAtlasAnchor(tree,this.metadata.localBase)));");
 }else if(name==='native-far-ground-seam.js'){
  replace('world.spatialSession.horizonSource.snapshot()',"globalThis.qaTailMeasure('seam-terrain-snapshot',()=>world.spatialSession.horizonSource.snapshot())");
  replace('pending=stream.request(next,request).then',"pending=globalThis.qaTailMeasure('seam-request-submit',()=>stream.request(next,request)).then");
 }else if(name==='native-far-ground.js'){

  replace('geometry.computeVertexNormals();',"globalThis.qaTailMeasure('far-ground-normals',()=>geometry.computeVertexNormals());");
  replace('farGroundColorUvs(data.positions,map)',"globalThis.qaTailMeasure('far-ground-uvs',()=>farGroundColorUvs(data.positions,map))");
  replace('world.biomeGround.attach(material,0,0,null,{mapped:false});',"globalThis.qaTailMeasure('far-ground-material',()=>world.biomeGround.attach(material,0,0,null,{mapped:false}));");
  replace('farToon.material(material);',"globalThis.qaTailMeasure('far-ground-toon',()=>farToon.material(material));");
 }else if(name==='global-frame-scheduler.js'){

  replace('const result=selected.iterator.next(value);',"const result=globalThis.qaTailMeasure('scheduler-unit:'+String(typeof selected.label==='function'?selected.label():selected.label??selected.key),()=>selected.iterator.next(value));");
 }else throw Error('Unknown probe source '+name);
 return source;
}
