import {createSimulation} from './mobility-worker-simulation-core.js';let sim;
async function gzip(text){const stream=new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));return new Uint8Array(await new Response(stream).arrayBuffer());}
async function gunzip(buffer){const stream=new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));return new Response(stream).text();}
self.onmessage=async({data:d})=>{try{
 if(d.kind==='init'){const start=performance.now(),decompressStart=performance.now(),source=d.compressed?await gunzip(d.compressed):d.source??null,decompressMs=performance.now()-decompressStart;sim=await createSimulation({mangrove:true,snapshotSource:source,chunkKeys:d.chunks??null});const initMs=performance.now()-start;postMessage({kind:'ready',id:d.id,initMs,decompressMs,state:sim.state()});}
 else if(d.kind==='advance'){for(let i=0;i<d.steps;i++)sim.advanceTick(.05);postMessage({kind:'advanced',id:d.id,state:sim.state()});}
 else if(d.kind==='checkpoint'){const start=performance.now(),snapshot=sim.state().snapshot,serializeMs=performance.now()-start;if(d.compressed){const t=performance.now(),payload=await gzip(snapshot),compressMs=performance.now()-t;postMessage({kind:'checkpoint',id:d.id,payload,serializeMs,compressMs},[payload.buffer]);}else postMessage({kind:'checkpoint',id:d.id,payload:snapshot,serializeMs,compressMs:0});}
}catch(error){postMessage({kind:'error',id:d.id,error:String(error?.stack??error)});}};
