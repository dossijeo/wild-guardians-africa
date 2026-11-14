import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';

export async function createWorkload(){
 const [binary,fixture]=await Promise.all([fetch('/src/world/wild-engine/spatial-savanna.wasm'),fetch('/tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')]);
 if(!binary.ok||!fixture.ok)throw Error(`Workload assets unavailable: ${binary.status}/${fixture.status}`);
 const module=await WebAssembly.compile(await binary.arrayBuffer());
 // Fetch already decodes Content-Encoding; only decompress raw .gz responses.
 const body=fixture.headers.get('content-encoding')?.includes('gzip')?fixture.body:fixture.body.pipeThrough(new DecompressionStream('gzip'));
 const state=JSON.parse(await new Response(body).text()),loaded=new Map();
 const session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)}),v=state.villages[0],cx=Math.floor((v.x+24)/48),cz=Math.floor((v.z+24)/48);
 for(let z=cz-1;z<=cz+1;z++)for(let x=cx-1;x<=cx+1;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
 const options={worker:false,species:'warthog'};session.actorSectorRevision(options);
 function task(){
  let queries=0,found=0,unknown=0,hash=2166136261;
  return {run(count){for(let n=0;n<count;n++){const i=queries++,a={x:v.x-12+(i%7)*3,z:v.z-12+(Math.floor(i/7)%7)*3},b={x:a.x+9,z:a.z+7},result=session.routeActorNative(a,b,options);if(result.status==='found')found++;if(result.status==='unknown')unknown++;const str=JSON.stringify(result);for(let c=0;c<str.length;c++)hash=Math.imul(hash^str.charCodeAt(c),16777619)>>>0;}return {queries,found,unknown,hash};}};
 }
 return {
  task,
  execute(duration){
   const started=performance.now();let queries=0,found=0,unknown=0;
   do{const i=queries++,a={x:v.x-12+(i%7)*3,z:v.z-12+(Math.floor(i/7)%7)*3},b={x:a.x+9,z:a.z+7},result=session.routeActorNative(a,b,options);if(result.status==='found')found++;if(result.status==='unknown')unknown++;}while(performance.now()-started<duration);
   return {elapsed:performance.now()-started,queries,found,unknown};
  },
  dispose(){session.dispose();}
 };
}
