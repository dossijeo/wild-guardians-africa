import assert from 'node:assert/strict';
export function regionalTailProbe(source,name){
 const replace=(a,b)=>{assert(source.includes(a),'Missing probe anchor '+name+': '+a);source=source.replace(a,b);};
 if(name==='far-scene-loader.js'){
  replace('worker=workerFactory();',"worker=globalThis.qaTailMeasure('worker-create',()=>workerFactory());");
  replace('worker.postMessage(request);',"globalThis.qaTailMeasure('worker-post-message',()=>worker.postMessage(request));");
  replace('worker.terminate();',"globalThis.qaTailMeasure('worker-terminate',()=>worker.terminate());");
  replace('worker.onmessage=({data})=>finish(data.error?new Error(data.error):null,data);',"worker.onmessage=event=>globalThis.qaTailMeasure('worker-receiver',()=>{const data=globalThis.qaTailMeasure('worker-event-data',()=>event.data);const payloadStart=performance.now(),ground=data.data?.ground;const buffers=new Set();for(const value of Object.values(ground??{})){if(ArrayBuffer.isView(value))buffers.add(value.buffer);else if(value&&typeof value==='object')for(const item of Object.values(value))if(ArrayBuffer.isView(item))buffers.add(item.buffer);}globalThis.qaTailSpan({label:'worker-payload-shape',start:payloadStart,duration:performance.now()-payloadStart,treeCount:data.data?.trees?.length??0,treeFields:Object.keys(data.data?.trees?.[0]??{}),transferredGroundBytes:[...buffers].reduce((sum,b)=>sum+b.byteLength,0),scope:'Metadata inspection only; does not measure serialization or GPU execution.'});return finish(data.error?new Error(data.error):null,data);});");
 }else if(name==='native-far-layer.js'){
  replace('this.onPrepare=onPrepare;',"this.onPrepare=span=>{globalThis.qaTailSpan(span);onPrepare?.(span);};");
  replace('const trees=this.selectTrees(result.data.trees).map(tree=>treeAtlasAnchor(tree,this.metadata.localBase));',"const trees=globalThis.qaTailMeasure('far-select-anchor',()=>this.selectTrees(result.data.trees).map(tree=>treeAtlasAnchor(tree,this.metadata.localBase)));");
 }else if(name==='native-far-ground-seam.js'){
  replace('world.spatialSession.horizonSource.snapshot()',"globalThis.qaTailMeasure('seam-terrain-snapshot',()=>world.spatialSession.horizonSource.snapshot())");
  replace('pending=stream.request(next,request).then',"pending=globalThis.qaTailMeasure('seam-request-submit',()=>stream.request(next,request)).then");
 }else if(name==='native-far-ground.js'){
  replace('new AfricanToon({visualSearch:world.visualSearch})',"globalThis.qaTailMeasure('far-ground-toon-create',()=>new AfricanToon({visualSearch:world.visualSearch}))");
  replace("nativeGroundMaterial('muy_baja')","globalThis.qaTailMeasure('far-ground-material-create',()=>nativeGroundMaterial('muy_baja'))");
  replace('const water=data.water??new Float32Array(data.positions.length/3);if(!data.water&&world.nav?.field)for(let i=0;i<water.length;i++)water[i]=world.nav.field.waterInfo(data.positions[i*3],data.positions[i*3+2]).inside?1:0;',"const water=globalThis.qaTailMeasure('far-ground-water-input',()=>{const water=data.water??new Float32Array(data.positions.length/3);if(!data.water&&world.nav?.field)for(let i=0;i<water.length;i++)water[i]=world.nav.field.waterInfo(data.positions[i*3],data.positions[i*3+2]).inside?1:0;return water;});");


  replace('geometry.computeVertexNormals();',"globalThis.qaTailMeasure('far-ground-normals',()=>geometry.computeVertexNormals());");
  replace('farGroundColorUvs(data.positions,map)',"globalThis.qaTailMeasure('far-ground-uvs',()=>farGroundColorUvs(data.positions,map))");
  replace('world.biomeGround.attach(material,0,0,null,{mapped:false});',"globalThis.qaTailMeasure('far-ground-material',()=>world.biomeGround.attach(material,0,0,null,{mapped:false}));");
  replace('farToon.material(material);',"globalThis.qaTailMeasure('far-ground-toon',()=>farToon.material(material));");
 }else if(name==='global-frame-scheduler.js'){

  replace('const result=selected.iterator.next(value);',"const result=globalThis.qaTailMeasure('scheduler-unit:'+String(typeof selected.label==='function'?selected.label():selected.label??selected.key),()=>selected.iterator.next(value));");
 }else throw Error('Unknown probe source '+name);
 return source;
}
