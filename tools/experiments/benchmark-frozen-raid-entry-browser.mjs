// Measures the main-thread frame stall of one frozen native raid-entry selection.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const fixture=process.argv[2],output=process.argv[3];
if(!fixture||!output)throw Error('Usage: benchmark-frozen-raid-entry-browser.mjs STATE.json.gz OUTPUT.json');
const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;
if(!modulePath)throw Error('Set WG_QA_PLAYWRIGHT_MODULE to a local Playwright index.mjs');
const {chromium}=await import(pathToFileURL(modulePath).href);
const regionPreflight=process.env.WG_QA_REGION_PREFLIGHT==='1';
const frozen=gunzipSync(readFileSync(fixture)).toString();
const browser=await chromium.launch({channel:process.env.WG_QA_BROWSER??'chrome',headless:process.env.WG_QA_HEADLESS!=='0'});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[];
page.on('pageerror',error=>errors.push(String(error)));
try{
  await page.goto(`${process.env.WG_QA_URL??'http://127.0.0.1:5188'}/tests/browser/wild-engine-raid-entry-benchmark.html`);
  const result=await page.evaluate(async({frozen,regionPreflight})=>{
    const {deserialize}=await import('/src/persistence/snapshots.js');
    const {createSpatialGameSession}=await import('/src/world/wild-engine/spatial-game-session.js');
    const {createSpatialNavigationMovement}=await import('/src/world/wild-engine/spatial-navigation-movement.js');
    const {createEventDrivenTaskPlanner}=await import('/src/world/wild-engine/spatial-intent-bridge.js');
    const {exteriorRaidEntry,raidWallEnvelope}=await import('/src/simulation/raid-exterior-entry.js');
    const state=deserialize(frozen),module=await WebAssembly.compile(await(await fetch('/src/world/wild-engine/spatial-savanna.wasm')).arrayBuffer());
    const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
    try{
      const village=state.villages[0],cx=Math.floor((village.x+24)/48),cz=Math.floor((village.z+24)/48);
      for(let z=cz-4;z<=cz+4;z++)for(let x=cx-4;x<=cx+4;x++){
        if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
        loaded.set(`${x},${z}`,session.core.chunkPayload());
      }
      const nav=createSpatialNavigationMovement(session,state),bounds=[(cx-4)*48-24,(cz-4)*48-24,(cx+4)*48+24,(cz+4)*48+24];
      const center=state.structures.find(item=>item.kind==='center'&&item.hp>0),eye={x:99.70247532024266,z:30.57367599590944};
      nav.setActiveBounds(bounds);nav.setRaidView(eye,center);
      const planner=createEventDrivenTaskPlanner(session);planner.resetFromState(state);
      const specs=state.raid.animals.map(item=>({radius:item.radius}));
      const original={entries:state.raid.animals.map(item=>item.spawn),exits:state.raid.animals.map(item=>item.exit)};
      const counters={},routeStatuses={},routeStatusMs={},routeInputs=new Map();
      for(const key of ['spatialRouteStatus','spatialExteriorEdge','spatialRelevantWallApproachSides','spatialWallApproachSides','segmentClear','walkable']){
        if(typeof nav[key]!=='function')continue;
        const originalFn=nav[key];
        nav[key]=function(...args){const start=performance.now();let value;try{value=originalFn.apply(this,args);return value;}finally{
          const duration=performance.now()-start,row=counters[key]??={calls:0,ms:0};row.calls++;row.ms+=duration;
          if(key==='spatialRouteStatus'){
            routeStatuses[value]=(routeStatuses[value]??0)+1;
            routeStatusMs[value]=(routeStatusMs[value]??0)+duration;
            const [from,to,radius]=args,k=`${from.x.toFixed(2)},${from.z.toFixed(2)}>${to.x.toFixed(2)},${to.z.toFixed(2)}@${radius}`;
            const input=routeInputs.get(k)??{count:0,statuses:{}};input.count++;input.statuses[value]=(input.statuses[value]??0)+1;routeInputs.set(k,input);
          }
        }};
      }
      let preflightBlocked=0,preflightMs=0,preflightCalls=0;
      if(regionPreflight){
        const route=nav.spatialRouteStatus;
        nav.spatialRouteStatus=(start,end,radius)=>{
          const at=performance.now(),connection=nav.regionConnected(start,end,radius,null,false);
          preflightMs+=performance.now()-at;preflightCalls++;
          if(connection===false){preflightBlocked++;return 'blocked';}
          return route(start,end,radius);
        };
      }
      let beforeFrame=0,afterFrame=0,selectionMs=0,selected=null;
      await new Promise(resolve=>requestAnimationFrame(t=>{beforeFrame=t;resolve();}));
      await new Promise(resolve=>requestAnimationFrame(()=>{
        const start=performance.now();selected=exteriorRaidEntry(state,specs,bounds,0,nav,()=>original,()=>null);
        selectionMs=performance.now()-start;
        requestAnimationFrame(t=>{afterFrame=t;resolve();});
      }));
      return {day:state.day,animals:specs.length,walls:state.structures.filter(s=>s.kind==='wall'&&s.hp>0).length,
        wallEnvelope:raidWallEnvelope(state,nav),selectionMs,frameGapMs:afterFrame-beforeFrame,
        selectedWall:selected?.wallOpportunity??null,selectionBounds:selected?.selectionBounds??null,
        counters,routeStatuses,routeStatusMs,preflightCalls,preflightBlocked,preflightMs,
        uniqueRouteInputs:routeInputs.size,duplicateRouteInputs:[...routeInputs.values()].filter(row=>row.count>1).length,
        linearMemoryBytes:session.core.wasm.memory?.buffer?.byteLength??null};
    }finally{session.dispose();}
  },{frozen,regionPreflight});
  const report={kind:'chrome-main-thread-frozen-raid-entry',fixture,regionPreflight,
    fixtureSha256:createHash('sha256').update(readFileSync(fixture)).digest('hex'),
    wasmSha256:createHash('sha256').update(readFileSync('src/world/wild-engine/spatial-savanna.wasm')).digest('hex'),
    chromeVersion:browser.version(),result,errors};
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report.result));
  if(errors.length)throw Error(`Browser errors: ${errors.join('; ')}`);
}finally{await browser.close();}
