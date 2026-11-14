import '../../../src/rendering/webgpu-world-worker.js';

// Test-only fault injection around the actual product preparation Worker.
const productionMessage=self.onmessage;
let diagnostic=null;
self.onmessage=event=>{
 if(event.data?.kind==='configure-control-fault'){
  diagnostic=event.data.port;diagnostic.start();return;
 }
 if(event.data?.kind==='block-control-preparation'){
  const start=performance.timeOrigin+performance.now();
  diagnostic.postMessage({kind:'block-start',start});
  const until=performance.now()+500;
  while(performance.now()<until){}
  diagnostic.postMessage({kind:'block-end',start,end:performance.timeOrigin+performance.now()});return;
 }
 return productionMessage(event);
};
