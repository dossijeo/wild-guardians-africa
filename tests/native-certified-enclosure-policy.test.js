import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {createSpatialIntentBridge} from '../src/world/hierarchical-wasm/spatial-intent-bridge.js';
import {createNativeCertifiedEnclosurePolicy} from '../tools/native-certified-enclosure-policy.mjs';

const binary=process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM;
const module=binary?new WebAssembly.Module(readFileSync(binary)):null;

test('certified defense saves until a complete enclosure is affordable and buys it once',
 {skip:!module&&'Build and select the spatial-services WASM first'},async()=>{
  const state=deserialize(gunzipSync(readFileSync(new URL(
    './fixtures/sabana712-d2-enclosure-connectors.json.gz',import.meta.url))).toString());
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const jobs=new Map();
    for(let z=-1;z<=1;z++)for(let x=1;x<=3;x++)
      jobs.set(`${x},${z}`,{cx:x,cz:z,score:Math.hypot(x,z)});
    session.stream.plan(jobs);await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    const advice=createSpatialIntentBridge(session);advice.resetFromState(state);
    const policy=createNativeCertifiedEnclosurePolicy(state,nav,advice);
    let sequence=0;
    const options={command:kind=>`certified-${kind}-${sequence++}`,reserve:60};
    assert.equal(numberOf(state.ledger.balance),8);
    assert.equal(policy.act(state,nav,options),0);
    const pending=policy.report();
    assert.equal(pending.candidate?.cost,350);
    assert.equal(pending.builds,0);
    assert.equal(state.structures.filter(item=>item.kind==='wall').length,0);

    state.ledger.balance=rational(1000); // Explicit paid-command fixture credit.
    policy.onGameEvent({type:'CrateDelivered'});
    assert.equal(policy.act(state,nav,options),1);
    assert.equal(numberOf(state.ledger.balance),650);
    assert.equal(state.structures.filter(item=>item.kind==='wall').length,35);
    assert.equal(policy.report().builds,1);
    assert.equal(policy.report().history.at(-1).kind,'built');
    advice.applyCommittedEvents(state,[state.events.at(-1)]);
    assert.equal(advice.getUnprotectedCropGroups({includeProtected:true})[0].protection,
      'protected');
  }finally{session.dispose();}
});
