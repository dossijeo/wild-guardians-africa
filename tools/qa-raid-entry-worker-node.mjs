import {parentPort} from 'node:worker_threads';
globalThis.self={postMessage:data=>parentPort.postMessage(data)};
await import('../src/world/raid-entry-worker.js');
parentPort.on('message',data=>self.onmessage({data}));
parentPort.postMessage({kind:'node-ready'});
