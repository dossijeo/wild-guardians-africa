import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
let session,village,active=false;
try{
 const [binary,fixture]=await Promise.all([fetch('/src/world/wild-engine/spatial-savanna.wasm'),fetch('/tests/fixtures/manglares-123-d10-raid-state.json.gz')]);
 if(!binary.ok||!fixture.ok)throw Error('Missing native fixture');
 const body=fixture.headers.get('content-encoding')?.includes('gzip')?fixture.body:fixture.body.pipeThrough(new DecompressionStream('gzip'));
 const [module,state]=await Promise.all([WebAssembly.compile(await binary.arrayBuffer()),new Response(body).json()]);state.mangroveNetwork=true;state.mangroveSettlementVersion=2;
 const loaded=new Map();village=state.villages[0];const cx=Math.floor((village.x+24)/48),cz=Math.floor((village.z+24)/48);
 session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 for(let z=cz-1;z<=cz+1;z++)for(let x=cx-1;x<=cx+1;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
 postMessage({kind:'ready',chunks:loaded.size,network:state.mangroveNetwork});
}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=event=>{
 const request=event.data;
 if(request.kind==='cancel'){postMessage({kind:'cancel-result',id:request.id,accepted:active,at:performance.timeOrigin+performance.now()});return;}
 if(request.kind!=='run'||!session)return;
 try{active=true;const start=performance.now();postMessage({kind:'started',id:request.id,at:performance.timeOrigin+start});
  const result=session.actorRegions(village,{worker:false,species:'hyena'}),end=performance.now();active=false;
  postMessage({kind:'result',id:request.id,version:request.version,at:performance.timeOrigin+end,elapsed:end-start,result});
 }catch(error){active=false;postMessage({kind:'error',id:request.id,error:String(error?.stack??error)});}
};
