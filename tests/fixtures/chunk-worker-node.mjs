import {parentPort} from 'node:worker_threads';

globalThis.self={postMessage(message,transfers=[]){parentPort.postMessage(message,transfers);parentPort.postMessage({audit:true,id:message.id,lengths:transfers.map(b=>b.byteLength)});}};
await import('../../src/rendering/chunk-worker.js');
parentPort.on('message',data=>self.onmessage({data}));
