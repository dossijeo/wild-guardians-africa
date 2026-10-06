import {parentPort} from 'node:worker_threads';
globalThis.self={postMessage(message,transfers=[]){parentPort.postMessage(message,transfers);parentPort.postMessage({audit:true,lengths:transfers.map(b=>b.byteLength)});}};
await import('../../tools/experiments/far-scene-worker.js');
parentPort.on('message',data=>self.onmessage({data}));
