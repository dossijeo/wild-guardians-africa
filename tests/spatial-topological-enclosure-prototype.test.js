import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createPlant} from '../src/simulation/crops.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {createSpatialIntentBridge} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {classifyCutBoundaryFaces,cutQuoteOmissionReason,proposeHybridEnclosure} from
  '../src/world/wild-engine/spatial-hybrid-enclosure-prototype.js';
import {createCropEnclosurePlanner} from '../src/world/wild-engine/spatial-crop-enclosure-plan.js';
import {createNativeTopologicalDefensePolicy} from '../tools/native-topological-defense-policy.mjs';
import {approximateCutModules,cropClearanceHull,cutEdgesToStrokes,enclosureJunctions,inspectNaturalJunctions,
  identifyNaturalCorridor,
  inspectPlacedNaturalJunctions,inspectSelfClosedQuote,
  inspectStaticCutBoundary,junctionBlocksSmallestAnimal,
  placedEnclosureJunctions,
  SMALLEST_ANIMAL_RADIUS,stitchTwoCutStrokes,
  wallOccludesBoundaryFace} from '../src/world/wild-engine/spatial-topological-enclosure-prototype.js';
import {findVillageEntry,villageLayout} from '../src/world/villages.js';
import {containsPoint} from '../src/world/footprints.js';
import {Navigation} from '../src/world/navigation.js';
import {rational} from '../src/simulation/money.js';
import {agriculturalRayClear,AGRICULTURAL_PROFILE_LIMITS} from '../src/simulation/raid-agricultural-impact.js';
import {ANIMAL_SPATIAL_PROFILES} from '../src/world/wild-engine/spatial-movement-profiles.js';
import * as Game from '../src/simulation/game.js';

test('cut diagnostics distinguish uncertified blockage from unavailable geometry',()=>{
  const boundary=[0,0,1,0,1,0,2,0,2,0,3,0,3,0,4,0];
  const codes=[1,0,-1,3];
  let calls=0;
  const wasm={lazy_cut_face_natural:()=>codes[calls++]};
  const result=classifyCutBoundaryFaces(boundary,wasm);
  assert.equal(calls,4);
  assert.deepEqual(result.faceCounts,
    {solid:1,wetland:0,river:1,cliff:0,unknown:2});
  assert.deepEqual(result.unprovedFaces,{uncertified:1,undetermined:1,other:0,
    samples:[{edge:[1,0,2,0],code:0},{edge:[2,0,3,0],code:-1}]});
  assert.deepEqual(classifyCutBoundaryFaces(boundary,wasm,codes),result,
    'Cached classifications must not repeat native calls');
  assert.equal(calls,4);
});

test('a physically blocked cut slot reaches certification, but crops and unaccounted slots do not',()=>{
  const quote={expectedSlots:[{},{}],pieces:[{}],blockedPieces:[{}],
    blockedCrops:[]};
  assert.equal(cutQuoteOmissionReason(quote,{nativeBoundary:true}),null);
  assert.equal(cutQuoteOmissionReason(quote),'omitted-module');
  assert.equal(cutQuoteOmissionReason({...quote,blockedPieces:[],
    blockedCrops:[{}]}),'crop-overlap');
  assert.equal(cutQuoteOmissionReason({...quote,blockedPieces:[],
    blockedCrops:[]}), 'unaccounted-module');
});

test('clearance hull yields a closed free-form candidate around every crop',()=>{
  const crops=[{x:0,z:0},{x:8,z:0},{x:8,z:7},{x:2,z:4}];
  const hull=cropClearanceHull(crops,2);
  assert.deepEqual(hull[0],hull.at(-1));
  assert.ok(hull.length>5);
  const polygon=hull.map(([x,z])=>({x,z}));
  for(const crop of crops)for(const dx of [-2,2])for(const dz of [-2,2])
    assert.equal(containsPoint(polygon,crop.x+dx*.99,crop.z+dz*.99),true);
  assert.equal(cropClearanceHull([{x:1,z:2}],2).length,5);
  assert.throws(()=>cropClearanceHull(crops,0),/clearance/);
});

test('native cut edges form an arbitrary world contour without assuming a rectangle',()=>{
  const cells=[[1,1],[2,1],[3,1],[1,2],[1,3]];
  const inside=new Set(cells.map(([x,z])=>`${x},${z}`)),edges=[];
  for(const [x,z] of cells)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])
    if(!inside.has(`${x+dx},${z+dz}`))edges.push(x+dx,z+dz,x,z);
  const shape=cutEdgesToStrokes(edges);
  assert.equal(shape.ambiguous.length,0);
  assert.equal(shape.strokes.length,1);
  assert.deepEqual(shape.strokes[0][0],shape.strokes[0].at(-1));
  assert.ok(new Set(shape.strokes[0].map(point=>point[0])).size>2);
  assert.ok(new Set(shape.strokes[0].map(point=>point[1])).size>2);
  assert.equal(enclosureJunctions(shape.strokes).length,0);
  assert.throws(()=>cutEdgesToStrokes([0,0,4,4]),/nonlocal/);
  const stitched=stitchTwoCutStrokes([[[0,0],[1,0]],[[2,0],[3,0]]]);
  assert.deepEqual(stitched[0],stitched.at(-1));
  assert.equal(stitchTwoCutStrokes([[[0,0],[1,0]],[[30,0],[31,0]]]),null);
  const junctions=enclosureJunctions([[[0,0],[1,0]],[[2,0],[3,0]]]);
  assert.equal(junctions.length,4);
  assert.deepEqual(junctions.map(item=>item.end),['start','finish','start','finish']);
  assert.equal(junctionBlocksSmallestAnimal(SMALLEST_ANIMAL_RADIUS*2-.01),true);
  assert.equal(junctionBlocksSmallestAnimal(SMALLEST_ANIMAL_RADIUS*2),false);
  assert.equal(junctionBlocksSmallestAnimal(NaN),null);
});

test('adjacent wall footprints occlude a whole attack face but a gap does not',()=>{
  const wall=(x,z=0,yaw=0)=>({id:`wall-${x}-${z}-${yaw}`,kind:'wall',material:'zarzas',
    status:'intact',x,z,yaw,baseScaleX:1});
  const a={x:-1,z:0},b={x:3,z:0};
  assert.equal(wallOccludesBoundaryFace(a,b,[wall(0),wall(2.18)]),true);
  const walls=[wall(0),wall(2.18)],state={structures:walls};
  const nav={version:0,obstacles:walls};
  for(let i=0;i<=16;i++){
    const x=a.x+(b.x-a.x)*i/16;
    assert.equal(agriculturalRayClear(state,nav,{x,z:-1},{x,z:1}),false);
  }
  assert.equal(wallOccludesBoundaryFace(a,b,[wall(0),wall(2.4)]),false);
  assert.equal(wallOccludesBoundaryFace(a,b,[wall(0),
    {...wall(2.18),status:'ruined'}]),false);
  assert.equal(wallOccludesBoundaryFace({x:0,z:-.6},{x:0,z:.6},[
    wall(0,0,Math.PI/2)]),true);
  assert.equal(wallOccludesBoundaryFace(a,b,[{kind:'tree',x:1,z:0}]),false);
});

test('natural joins inspect only exposed wall ends and require a continuous obstacle',()=>{
  const strokes=[[[0,0],[1,0]],[[2,0],[3,0]]];
  let calls=0;
  const narrow=()=>{calls++;return SMALLEST_ANIMAL_RADIUS*2-.01;};
  assert.equal(inspectNaturalJunctions(strokes,narrow,true).status,'joined');
  assert.equal(calls,4);
  assert.equal(inspectNaturalJunctions([strokes[0]],narrow,true).junctions,2);
  assert.equal(inspectNaturalJunctions(strokes,narrow,null).status,'unknown');
  assert.equal(inspectNaturalJunctions(strokes,narrow,false).status,'open');
  assert.equal(inspectNaturalJunctions(strokes,()=>SMALLEST_ANIMAL_RADIUS*2,true)
    .status,'open');
  assert.equal(inspectNaturalJunctions(strokes,()=>NaN,true).status,'unknown');
  assert.equal(inspectNaturalJunctions(strokes,()=>0,true).status,'joined');
});

test('static cut certificate bounds unsampled gaps and refuses uncertainty',()=>{
  const edge=[1,0,0,0];
  const blocked=inspectStaticCutBoundary(edge,(_x,z)=>Math.abs(z),
    {radius:.85});
  assert.equal(blocked.status,'blocked-by-static-solids');
  assert.ok(blocked.queries>2,'A coarse endpoint-only test is insufficient');
  assert.equal(inspectStaticCutBoundary(edge,(_x,z)=>Math.abs(z)+.5,
    {radius:.85}).status,'unknown');
  assert.equal(inspectStaticCutBoundary(edge,()=>NaN).status,'unknown');
  assert.equal(inspectStaticCutBoundary([],()=>0).status,'unknown');
  assert.equal(inspectStaticCutBoundary(edge,()=>.8,
    {radius:.85,maxQueries:2}).status,'unknown');
  assert.throws(()=>inspectStaticCutBoundary([0,0,3,0],()=>0),/adjacent/);
});

test('a placed free-form wall loop needs a gate and no omitted modules',()=>{
  const piece=(id,x,z,yaw,gate=false)=>({id,kind:'wall',material:'zarzas',
    hp:100,status:'intact',baseScaleX:4/2.18,x,z,yaw,gate,autoGate:gate});
  const walls=[piece('a',0,2,0,true),piece('b',2,0,-Math.PI/2),
    piece('c',0,-2,0),piece('d',-2,0,-Math.PI/2)];
  const quote={pieces:walls,previewPieces:walls,blockedPieces:[],blockedCrops:[]};
  assert.deepEqual(inspectSelfClosedQuote(quote,[],[{x:0,z:0}]),
    {status:'closed-wall-loop',gates:['a'],attackOccluded:true});
  assert.equal(inspectSelfClosedQuote({...quote,blockedPieces:[walls[0]]},[],
    [{x:0,z:0}]).status,'open');
  assert.deepEqual(inspectSelfClosedQuote({...quote,previewPieces:walls.map(p=>
    ({...p,gate:false}))},[],[{x:0,z:0}]),
    {status:'closed-without-gate',attackOccluded:true});
  assert.equal(inspectSelfClosedQuote({...quote,previewPieces:walls.map((p,i)=>
    i===0?{...p,autoGate:false}:p)},[],[{x:0,z:0}]).status,
  'closed-without-gate');
  assert.equal(inspectSelfClosedQuote({...quote,previewPieces:walls.slice(1)},[],
    [{x:0,z:0}]).status,'open');
  assert.equal(inspectSelfClosedQuote({pieces:[walls[2]],
    previewPieces:[walls[2]],blockedPieces:[],blockedCrops:[]},
  [walls[0],walls[1],walls[3]],[{x:0,z:0}]).status,'closed-wall-loop');
  assert.equal(inspectSelfClosedQuote({...quote,previewPieces:walls.map((p,i)=>
    i===1?{...p,status:'ruined'}:p)},[],[{x:0,z:0}]).status,'open');
});

test('a sub-body seam in a closed wall loop blocks committed crop hits',()=>{
  assert.ok(SMALLEST_ANIMAL_RADIUS*2>.2,
    'The smallest animal must exceed the maximum snapped endpoint separation');
  const piece=(id,x,z,yaw,length,gate=false)=>({id,kind:'wall',
    material:'zarzas',hp:100,status:'intact',baseScaleX:length/2.18,
    x,z,yaw,gate,autoGate:gate});
  const walls=[piece('top-left',-1.02,2,0,1.96),
    piece('top-right',1.02,2,0,1.96),
    piece('right',2,0,-Math.PI/2,4),piece('bottom',0,-2,0,4,true),
    piece('left',-2,0,-Math.PI/2,4)];
  const quote={pieces:walls,previewPieces:walls,blockedPieces:[],
    blockedCrops:[]};
  assert.equal(agriculturalRayClear({structures:walls},
    {obstacles:walls,version:1},{x:0,z:3},{x:0,z:0}),true,
  'A point ray can pass the snapped seam');
  assert.equal(agriculturalRayClear({structures:walls},
    {obstacles:walls,version:1},{x:0,z:3},{x:0,z:0},
    SMALLEST_ANIMAL_RADIUS),false,
  'The smallest animal cannot apply a crop hit through the seam');
  assert.deepEqual(inspectSelfClosedQuote(quote,[],[{x:0,z:0}]),
    {status:'closed-wall-loop',gates:['bottom'],attackOccluded:true});
  const wide=[piece('top-left',-1.15,2,0,1.7),
    piece('top-right',1.15,2,0,1.7),...walls.slice(2)];
  assert.equal(inspectSelfClosedQuote({...quote,pieces:wide,
    previewPieces:wide},[],[{x:0,z:0}]).status,'open');
});

test('a canyon river blocks the crop-hit ray across a natural barrier',()=>{
  const state=Game.newGame({seed:712,biome:'gran-canon'});
  const nav=new Navigation(712,'gran-canon',{});
  nav.field={canyon:true,riverLevel:0,surface:()=>0,slope:()=>0,
    fluidInside:(x,z)=>Math.abs(x)<.3,
    waterInfo:(x,z)=>({inside:Math.abs(x)<.3,level:0})};
  nav.propsAt=()=>[];
  nav.setState(state);
  assert.equal(agriculturalRayClear(state,nav,{x:-.65,z:0},
    {x:.65,z:0},SMALLEST_ANIMAL_RADIUS),false);
});

test('two wall strokes quote and purchase atomically with one automatic gate',()=>{
  const state=Game.newGame({seed:712});
  const nav=new Navigation(712,'sabana',{});
  nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};
  nav.propsAt=()=>[];
  Game.placeStructure(state,'center',{x:-10,z:-10},nav);
  const strokes=[[[0,0],[8,0],[8,8]],[[8,8],[0,8],[0,0]]];
  const before=serialize(state);
  const quote=Game.previewWallChain(state,'zarzas',strokes,nav,
    {smooth:false,snap:false});
  assert.equal(serialize(state),before);
  const duplicate=Game.quoteWallChain(state,'zarzas',
    [strokes[0],strokes[0],strokes[1]],nav,{smooth:false,snap:false});
  assert.equal(duplicate.cost,quote.cost);
  assert.equal(quote.blockedPieces.length+quote.blockedCrops.length,0);
  assert.equal(quote.gates,1);
  assert.equal(placedEnclosureJunctions(quote).junctions.length,4);
  assert.equal(inspectSelfClosedQuote(quote,state.structures,[{x:4,z:4}]).status,
    'closed-wall-loop');
  assert.equal(Game.buildWallChain(state,'two-strokes','zarzas',strokes,nav,
    {smooth:false,snap:false,preparedPlan:quote}),true);
  assert.equal(state.structures.filter(item=>item.autoGate).length,1);
  nav.setState(state);
  for(const [species,profile] of Object.entries(ANIMAL_SPATIAL_PROFILES))
    assert.equal(agriculturalRayClear(state,nav,{x:4,z:-.65},{x:4,z:.65},
      profile.radius),false,`${species} cannot hit through the paid wall loop`);
  assert.equal(state.ledger.entries['two-strokes'].n,String(-quote.cost));
  assert.equal(serialize(deserialize(serialize(state))),serialize(state));
  const bottom=state.structures.filter(item=>item.kind==='wall'&&
    Math.abs(item.z)<.1).sort((a,b)=>Math.abs(a.x-4)-Math.abs(b.x-4))[0];
  assert.ok(bottom,'the purchased loop has a removable bottom module');
  assert.equal(Game.removeWall(state,'two-strokes-breach',bottom.id,nav),true);
  nav.setState(state);
  assert.equal(inspectSelfClosedQuote({pieces:state.structures,
    previewPieces:state.structures,blockedPieces:[],blockedCrops:[]},[],
  [{x:4,z:4}]).status,'open');
  assert.equal(agriculturalRayClear(state,nav,
    {x:bottom.x,z:-.65},{x:bottom.x,z:.65},SMALLEST_ANIMAL_RADIUS),true,
  'removing the module opens a physical attack ray through the breach');
});

test('natural-join checks use placed module ends and refuse missing pieces',()=>{
  const state=Game.newGame({seed:712});
  const nav=new Navigation(712,'sabana',{});
  nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};
  nav.propsAt=()=>[];
  Game.placeStructure(state,'center',{x:-10,z:-10},nav);
  const strokes=[[[0,0],[4,0]],[[4,8],[0,8]]];
  const quote=Game.quoteWallChain(state,'zarzas',strokes,nav,
    {smooth:false,snap:false});
  const placed=placedEnclosureJunctions(quote);
  assert.equal(placed.status,'ready');
  assert.equal(placed.junctions.length,4);
  assert.deepEqual(placed.junctions.map(item=>item.point),
    [[0,0],[4,0],[4,8],[0,8]]);
  let calls=0;
  const result=inspectPlacedNaturalJunctions(quote,()=>{calls++;return .3;},true);
  assert.equal(result.status,'joined');
  assert.equal(calls,4);
  assert.equal(placedEnclosureJunctions({...quote,
    previewPieces:quote.previewPieces.slice(1)}).reason,'missing-end-module');
  assert.equal(inspectPlacedNaturalJunctions({...quote,
    blockedPieces:[quote.pieces[0]]},()=>0,true).reason,'omitted-module');
  assert.equal(inspectPlacedNaturalJunctions({...quote,
    suppressed:[42]},()=>0,true).reason,'suppressed-static-obstacle');
});

test('separate arcs beside a building keep one gate and worker access',()=>{
  const state=Game.newGame({seed:712});
  const nav=new Navigation(712,'sabana',{});
  nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};
  nav.propsAt=()=>[];
  Game.placeStructure(state,'center',{x:-10,z:-10},nav);
  state.villages[0].entry={x:-4,z:4};
  state.villages[0].buildings=[{key:'join-house',kind:'Casa',x:10,z:4,
    radius:4,footprint:[{x:8,z:0},{x:12,z:0},{x:12,z:8},{x:8,z:8}]}];
  nav.setState(state);
  Game.plant(state,'crop','mijo',4,4,nav);
  const strokes=[[[10,0],[0,0],[0,8]],[[0,8],[10,8]]];
  const quote=Game.previewWallChain(state,'zarzas',strokes,nav,
    {smooth:false,snap:false});
  assert.equal(quote.gates,1);
  Game.buildWallChain(state,'building-arcs','zarzas',strokes,nav,
    {smooth:false,snap:false,preparedPlan:quote});
  assert.equal(state.structures.filter(item=>item.autoGate).length,1);
  assert.ok(nav.path(state.villages[0].entry,state.plants[0],.28,null,true));
  assert.ok(nav.path(state.plants[0],state.villages[0].entry,.28,null,true));
  const outside={x:12.65,z:4};
  for(const [species,profile] of Object.entries(ANIMAL_SPATIAL_PROFILES)){
    assert.equal(nav.path(outside,state.plants[0],profile.radius,null,false),null,
      `${species} cannot enter through the building or wall joins`);
    assert.equal(agriculturalRayClear(state,nav,outside,state.plants[0],
      profile.radius),false,`${species} cannot hit through the building`);
  }
  state.villages[0].buildings=[];
  nav.setState(state);
  assert.ok(nav.path(outside,state.plants[0],
    ANIMAL_SPATIAL_PROFILES.warthog.radius,null,false),
  'removing the building opens the mixed perimeter');
  assert.equal(agriculturalRayClear(state,nav,outside,state.plants[0],
    ANIMAL_SPATIAL_PROFILES.warthog.radius),true,
  'the former building no longer occludes a crop attack');
});

const path=process.env.WILD_ENGINE_TOPOLOGICAL_CUT_WASM;
const module=path?new WebAssembly.Module(readFileSync(path)):null;
const pack=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url),'utf8'))[0];
if(module&&WebAssembly.Module.imports(module).some(item=>item.module==='wasi_snapshot_preview1')){
  const Instance=WebAssembly.Instance;
  WebAssembly.Instance=function(mod,imports){return new Instance(mod,{
    ...imports,wasi_snapshot_preview1:{proc_exit(code){throw Error(`WASM exited: ${code}`);}}});};
}
test('day-80 cut detours around a rock only after renewed physical certification',
  {skip:!module&&'Build the experimental Wild Engine WASM first'},async()=>{
    const state=deserialize(gunzipSync(readFileSync(new URL(
      './fixtures/sabana712-d80-cut-obstacle-state.json.gz',import.meta.url)))
      .toString());
    assert.equal(state.day,80);
    assert.ok(state.pauses.includes('hiring'));
    Game.hire(state,'obstacle-regression-hire',{olderFemale:5});
    const loaded=new Map(),session=createSpatialGameSession(module,state,{
      loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
    try{
      const points=[...state.plants.filter(plant=>plant.alive),
        ...state.structures,...state.villages.map(v=>v.entry??v)];
      const chunk=value=>Math.floor((value+24)/48);
      const desired=new Map();
      for(let cz=chunk(Math.min(...points.map(p=>p.z))-48);
        cz<=chunk(Math.max(...points.map(p=>p.z))+48);cz++)
        for(let cx=chunk(Math.min(...points.map(p=>p.x))-48);
          cx<=chunk(Math.max(...points.map(p=>p.x))+48);cx++)
          desired.set(`${cx},${cz}`,{cx,cz,score:0});
      session.stream.plan(desired);await session.stream.whenIdle();
      const bridge=createSpatialIntentBridge(session);
      bridge.resetFromState(state);
      const group=bridge.getUnprotectedCropGroups()[0];
      assert.equal(group.cropIds.length,52);
      const nav=createSpatialNavigationMovement(session,state);
      for(const species of ['warthog','hyena','buffalo','lion','rhino'])
        session.actorRegionsBatch([{x:0,z:0}],{worker:false,species});
      session.actorRegionsBatch([{x:0,z:0}],{worker:true});
      const revisions=()=>{
        const wasm=session.core.wasm;
        const values=[];
        for(let i=0;i<6;i++){
          session.core.selectNavigationProfile(i);
          values.push(wasm.lazy_route_revision());
        }
        return {stamp:session.routeStamp(),sectors:wasm.lazy_sector_updates(),
          routes:values};
      };
      const beforePlan=revisions();
      const plan=createCropEnclosurePlanner(state,nav,bridge,session)
        .planCropEnclosure(group.id,{material:'zarzas',method:'topological'});
      assert.deepEqual(revisions(),beforePlan,
        'A detached wall detour must leave every confirmed navigation profile unchanged');
      assert.equal(plan.status,'ready',JSON.stringify(plan.attempts));
      assert.equal(plan.kind,'general-cut-local-detour');
      assert.equal(plan.modules.length,6);
      assert.equal(plan.cost,60);
      assert.equal(plan.proof.movementFaces.unknown,0);
      assert.ok(plan.proof.exposedAttackMargin>0);
      assert.ok(plan.proof.workerRoutesAfter.every(row=>row.every(Boolean)));
      assert.ok(Game.buildWallChain(state,'obstacle-regression-build','zarzas',
        plan.points,nav,{smooth:false,snap:false,
          preparedPlan:plan.preparedPlan}));
      bridge.resetFromState(state);
      assert.equal(bridge.getUnprotectedCropGroups({includeProtected:true})
        .find(item=>item.id===group.id)?.protection,'protected');
      const detourWall=state.structures.find(item=>item.kind==='wall'&&
        plan.modules.some(piece=>Math.hypot(piece.x-item.x,piece.z-item.z)<.01)&&
        Math.abs(item.x-106.5)<.01&&Math.abs(item.z+6.5)<.01);
      assert.ok(detourWall,'Expected the new wall beside the rock');
      assert.ok(Game.removeWall(state,'obstacle-regression-breach',
        detourWall.id,nav));
      const wasm=session.core.wasm;
      const crops=state.plants.filter(plant=>plant.alive);
      new Int32Array(wasm.memory.buffer,wasm.lazy_cut_seeds_ptr(crops.length),
        crops.length*2).set(crops.flatMap(plant=>[
          Math.round(plant.x),Math.round(plant.z)]));
      const reach=Math.max(...Object.values(ANIMAL_SPATIAL_PROFILES)
        .map(profile=>profile.radius))+.65+
        AGRICULTURAL_PROFILE_LIMITS.attackRadius;
      assert.ok(wasm.lazy_local_crop_cut_conservative_buildable(
        70,-18,108,19,crops.length,Math.ceil(reach)+2)>0,
      'Removing the detour must reopen the native physical cut');
    }finally{session.dispose();}
  });
test('native five-profile cut is deterministic and responds to local solid changes',
  {skip:!module&&'Build the experimental Wild Engine WASM first'},async()=>{
    const state=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe',
      slotId:'topological-cut-test'});
    state.villages[0].buildings=villageLayout(pack,0,0);
    const loaded=new Map(),session=createSpatialGameSession(module,state,{
      loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
    try{
      const jobs=new Map();
      for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)jobs.set(`${x},${z}`,
        {cx:x,cz:z,score:Math.hypot(x,z)});
      session.stream.plan(jobs);await session.stream.whenIdle();
      for(const species of ['warthog','hyena','buffalo','lion','rhino'])
        session.actorRegionsBatch([{x:-13,z:-13}],{worker:false,species});
      const wasm=session.core.wasm,topology=session.topologySource.revision();
      assert.equal(typeof wasm.spatial_static_object_clearance,'function');
      let clearanceSite=null;
      for(let z=-12;z<=12&&!clearanceSite;z+=3)for(let x=-12;x<=12;x+=3){
        const distance=wasm.spatial_static_object_clearance(x,z,4);
        if(distance>1.5)clearanceSite={x,z,distance};
      }
      assert.ok(clearanceSite,'Expected a resident point away from solid props');
      const {x:clearX,z:clearZ,distance:clearBefore}=clearanceSite;
      const passable=wasm.spatial_add_oriented_barrier(clearX,clearZ,1,.22,0,2);
      assert.equal(wasm.spatial_static_object_clearance(clearX,clearZ,4),
        clearBefore,'Animal-passable barriers do not count as solids');
      assert.equal(wasm.spatial_remove_barrier(passable),1);
      const solid=wasm.spatial_add_oriented_barrier(clearX,clearZ,1,.22,0,0);
      assert.equal(wasm.spatial_static_object_clearance(clearX,clearZ,4),0);
      assert.equal(wasm.spatial_remove_barrier(solid),1);
      assert.equal(wasm.spatial_static_object_clearance(clearX,clearZ,4),
        clearBefore);
      const polygonPointer=wasm.spatial_polygon_input_ptr(4);
      new Float32Array(wasm.memory.buffer,polygonPointer,8).set([
        clearX-.5,clearZ-.5,clearX+.5,clearZ-.5,
        clearX+.5,clearZ+.5,clearX-.5,clearZ+.5]);
      const polygon=wasm.spatial_add_polygon(4,0);
      assert.ok(polygon>0);
      assert.equal(wasm.spatial_static_object_clearance(clearX,clearZ,4),0);
      assert.equal(wasm.spatial_remove_polygon(polygon),1);
      assert.equal(wasm.spatial_static_object_clearance(clearX,clearZ,4),
        clearBefore);
      assert.ok(Number.isNaN(wasm.spatial_static_object_clearance(500,500,4)));
      assert.ok(Number.isNaN(wasm.spatial_static_object_clearance(clearX,clearZ,9)));
      const stateBefore=serialize(state),updates=wasm.lazy_sector_updates();
      const query=(x,z,variant='old')=>{
        const pointer=wasm.lazy_cut_seeds_ptr(1);
        new Int32Array(wasm.memory.buffer,pointer,2).set([x,z]);
        const count=variant==='conservative'?wasm.lazy_local_crop_cut_conservative(
            x-12,z-12,x+13,z+13,1,2):
          wasm.lazy_local_crop_cut(x-12,z-12,x+13,z+13,1,2);
        const boundaryCount=count>=0?wasm.lazy_local_crop_cut_boundary_count():0;
        return {count,edges:count>=0?Array.from(new Int32Array(wasm.memory.buffer,
          wasm.lazy_local_crop_cut_ptr(),count*4)):[],
        boundary:boundaryCount?Array.from(new Int32Array(wasm.memory.buffer,
          wasm.lazy_local_crop_cut_boundary_ptr(),boundaryCount*4)):[]};
      };
      const first=query(-13,-13),again=query(-13,-13);
      assert.ok(first.count>0);
      assert.ok(first.boundary.length>first.edges.length);
      assert.deepEqual(again,first);
      const conservative=query(-13,-13,'conservative');
      assert.ok(conservative.count>0);
      assert.deepEqual(query(-13,-13,'conservative'),conservative);
      assert.ok(conservative.boundary.length>=conservative.edges.length);
      assert.equal(wasm.lazy_sector_updates(),updates);
      assert.equal(session.topologySource.revision(),topology);
      assert.equal(serialize(state),stateBefore);
      assert.equal(query(500,500).count,-1);
      assert.equal(query(500,500,'conservative').count,-1);
      assert.equal(session.stream.releaseChunk(-1,-1),1);
      loaded.delete('-1,-1');
      assert.equal(query(-13,-13,'conservative').count,-1,
        'A missing crop-side sector cannot certify an enclosure');
      session.stream.plan(jobs);await session.stream.whenIdle();
      assert.deepEqual(query(-13,-13,'conservative'),conservative,
        'Reloading the same sector must restore the deterministic cut');
      const ring=[
        wasm.spatial_add_barrier(-13,-17,5,.4,0),
        wasm.spatial_add_barrier(-13,-9,5,.4,0),
        wasm.spatial_add_barrier(-17,-13,.4,5,0),
        wasm.spatial_add_barrier(-9,-13,.4,5,0)
      ];
      assert.ok(ring.every(id=>id>0));
      try{
        const closed=query(-13,-13,'conservative');
        assert.ok(closed.count<conservative.count,
          'A new solid enclosure must reduce the proposed cut');
        assert.equal(session.stream.releaseChunk(-1,-1),1);
        loaded.delete('-1,-1');
        assert.equal(query(-13,-13,'conservative').count,-1,
          'A closed loop cannot remain certified across a missing seed sector');
        session.stream.plan(jobs);await session.stream.whenIdle();
        assert.deepEqual(query(-13,-13,'conservative'),closed,
          'The same loop must reappear after its sector is restored');
        assert.equal(wasm.spatial_remove_barrier(ring[1]),1);
        ring[1]=0;
        const opened=query(-13,-13,'conservative');
        assert.ok(opened.count>closed.count,
          'A destroyed wall must reopen a topological cut');
      }finally{
        for(const id of ring)if(id)assert.equal(wasm.spatial_remove_barrier(id),1);
      }
      assert.deepEqual(query(-13,-13,'conservative'),conservative,
        'Removing the enclosure must restore the original cut without stale state');
    }finally{session.dispose();}
  });

test('native wetland face proof requires residency and rejects uncertain shores',
  {skip:!module&&'Build the experimental Wild Engine WASM first'},async()=>{
    const state=Game.newGame({seed:712,biome:'manglares',culture:'mapungubwe',
      slotId:'wetland-face-test'});
    state.villages[0].buildings=villageLayout(pack,0,0);
    const loaded=new Map(),session=createSpatialGameSession(module,state,{
      loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
    try{
      const jobs=new Map();
      for(let z=-1;z<=1;z++)for(let x=1;x<=2;x++)jobs.set(`${x},${z}`,
        {cx:x,cz:z,score:Math.hypot(x-2,z)});
      session.stream.plan(jobs);await session.stream.whenIdle();
      for(const species of ['warthog','hyena','buffalo','lion','rhino'])
        session.actorRegionsBatch([{x:94,z:-10}],{worker:false,species});
      const wasm=session.core.wasm;
      assert.equal(typeof wasm.lazy_cut_face_natural,'function');
      const wet=[],uncertifiedWet=[];
      for(let z=-13;z<=-7;z++)for(let x=91;x<=102;x++){
        for(const face of [[x,z,x+1,z],[x,z,x,z+1]]){
          const kind=wasm.lazy_cut_face_natural(...face);
          if(kind===2)wet.push(face);
          else if(kind===0&&wasm.spatial_fluid_level(
            (face[0]+face[2])*.5,(face[1]+face[3])*.5)>0)
            uncertifiedWet.push(face);
        }
      }
      assert.ok(wet.length>0,'Expected a continuously wet Manglares face');
      assert.ok(uncertifiedWet.length>0,
        'A wet midpoint alone must not certify a dry-gap-prone face');
      assert.equal(wasm.lazy_cut_face_natural(500,500,501,500),-1,
        'Unloaded space cannot certify a natural boundary');
      const first=wet[0];
      assert.equal(wasm.lazy_cut_face_natural(...first),2);
      const midpoint={x:(first[0]+first[2])*.5,z:(first[1]+first[3])*.5};
      assert.ok(wasm.spatial_add_settlement(midpoint.x,midpoint.z,2,2)>=0);
      assert.equal(wasm.lazy_cut_face_natural(...first),0,
        'A new settlement clearing the wetland invalidates its face proof');
      assert.equal(session.stream.releaseChunk(2,0),1);
      loaded.delete('2,0');
      assert.equal(wasm.lazy_cut_face_natural(...first),-1,
        'A wetland proof expires when its spatial chunk is unloaded');
    }finally{session.dispose();}
  });

test('native cut observes a paid wall stroke and its removal',
  {skip:!module&&'Build the experimental Wild Engine WASM first'},async()=>{
    const state=deserialize(gunzipSync(readFileSync(new URL(
      './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());
    state.structures=state.structures.filter(item=>
      !(item.kind==='wall'&&item.created>=27114));
    state.ledger.balance=rational(10000);
    const loaded=new Map(),session=createSpatialGameSession(module,state,{
      loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
    try{
      const desired=new Map();
      for(let z=-2;z<=2;z++)for(let x=-1;x<=3;x++)desired.set(`${x},${z}`,
        {cx:x,cz:z,score:Math.abs(x-1)+Math.abs(z)});
      session.stream.plan(desired);await session.stream.whenIdle();
      const nav=createSpatialNavigationMovement(session,state);
      nav.setActiveBounds([-72,-120,168,120]);
      for(const species of ['warthog','hyena','buffalo','lion','rhino'])
        session.actorRegionsBatch([{x:70,z:-12}],{worker:false,species});
      const wasm=session.core.wasm;
      const cut=()=>{
        new Int32Array(wasm.memory.buffer,wasm.lazy_cut_seeds_ptr(1),2).set([70,-12]);
        const count=wasm.lazy_local_crop_cut_conservative(54,-30,96,12,1,2);
        return count<0?{count}: {count,edges:Array.from(new Int32Array(
          wasm.memory.buffer,wasm.lazy_local_crop_cut_ptr(),count*4))};
      };
      const before=cut();
      assert.ok(before.count>0);
      const stroke=[[66,-7.18],[66,-18]],options={smooth:false,snap:false};
      assert.ok(Game.buildWallChain(state,'cut-real-build','zarzas',stroke,nav,options));
      const after=cut();
      assert.equal(after.count,0,'The paid stroke closes this local graph cut');
      const restored=deserialize(serialize(state)),reloadedChunks=new Map();
      const reloaded=createSpatialGameSession(module,restored,{
        loaded:()=>reloadedChunks,
        onData:data=>reloadedChunks.set(`${data.cx},${data.cz}`,data)});
      try{
        reloaded.stream.plan(desired);await reloaded.stream.whenIdle();
        for(const species of ['warthog','hyena','buffalo','lion','rhino'])
          reloaded.actorRegionsBatch([{x:70,z:-12}],{worker:false,species});
        const fresh=reloaded.core.wasm;
        new Int32Array(fresh.memory.buffer,fresh.lazy_cut_seeds_ptr(1),2).set([70,-12]);
        assert.equal(fresh.lazy_local_crop_cut_conservative(54,-30,96,12,1,2),
          after.count,'A restored session must reconstruct the closed graph');
      }finally{reloaded.dispose();}
      const created=state.structures.filter(item=>item.kind==='wall'&&
        item.created>=27114);
      assert.equal(created.length,5);
      let reopened=false;
      for(const [index,wall] of created.entries()){
        assert.ok(Game.removeWall(state,`cut-real-remove-${index}`,wall.id,nav));
        if(cut().count>0)reopened=true;
      }
      assert.ok(reopened,'Removing the paid stroke must eventually reopen the cut');
      assert.deepEqual(cut(),before,
        'After removing all five walls the original graph proposal is restored');
    }finally{session.dispose();}
  });

test('Gran Cañón natural corridor closes around planted crops and rejects uncertain protection',
  {skip:!module&&'Build the experimental Wild Engine WASM first'},async()=>{
    const state=Game.newGame({seed:712,biome:'gran-canon',culture:'mapungubwe',
      slotId:'topological-fluid-gap-test'});
    state.villages[0].buildings=villageLayout(pack,0,0);
    state.structures.push({id:'center-1',kind:'center',x:0,z:0,
      culture:'mapungubwe',villageId:'village-1',status:'intact',
      hp:600,maxHp:600});
    const site={x:-2,z:-8};
    state.plants.push(createPlant('fluid-gap-crop','mijo',site.x,site.z,
      'center-1'));
    const loaded=new Map(),session=createSpatialGameSession(module,state,{
      loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
    try{
      const jobs=new Map();
      for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)jobs.set(`${x},${z}`,
        {cx:x,cz:z,score:Math.hypot(x,z)});
      session.stream.plan(jobs);await session.stream.whenIdle();
      const nav=createSpatialNavigationMovement(session,state);
      for(const species of ['warthog','hyena','buffalo','lion','rhino'])
        session.actorRegionsBatch([site],{worker:false,species});
      const wasm=session.core.wasm;let before=serialize(state);
      new Int32Array(wasm.memory.buffer,wasm.lazy_cut_seeds_ptr(1),2)
        .set([site.x,site.z]);
      const count=wasm.lazy_local_crop_cut_conservative(-14,-20,11,5,1,2);
      assert.ok(count>0,'Expected a candidate cut, not a certified enclosure');
      const edges=Array.from(new Int32Array(wasm.memory.buffer,
        wasm.lazy_local_crop_cut_ptr(),count*4));
      const candidate=approximateCutModules(edges,state.structures,'zarzas',10);
      assert.equal(candidate.strokes.length,1);
      const quote=Game.quoteWallChain(state,'zarzas',candidate.strokes,nav,
        {smooth:false,snap:false});
      assert.equal(quote.blockedPieces.length,0);
      assert.deepEqual(inspectSelfClosedQuote(quote,state.structures,[site]),
        {status:'open',reason:'no-wall-face'});
      assert.equal(serialize(state),before,'The rejected quote is read-only');
      new Int32Array(wasm.memory.buffer,wasm.lazy_cut_seeds_ptr(1),2)
        .set([site.x,site.z]);
      assert.equal(wasm.lazy_local_crop_cut_conservative_buildable(
        -14,-20,11,5,1,2),count);
      const natural={river:[],cliff:[]};
      for(let z=-20;z<5;z++)for(let x=-14;x<11;x++){
        const code=wasm.lazy_cut_face_natural(x,z,x+1,z);
        if(code===3&&natural.river.length<4)natural.river.push([x,z]);
        if(code===4&&natural.cliff.length<4)natural.cliff.push([x,z]);
      }
      assert.ok(natural.river.length>0,'The real resident river must have proved faces');
      assert.ok(natural.cliff.length>0,JSON.stringify(natural));
      const originalEntry=findVillageEntry(nav,state.villages[0].buildings,0,0);
      assert.ok(originalEntry);
      state.villages[0].entry=originalEntry;
      before=serialize(state);
      const corridorSeeds=[];
      for(const targetZ of [45,53,61]){
        const options=[];
        for(let z=targetZ-2;z<=targetZ+2;z++){
          const river=wasm.spatial_river_center(z);
          for(let x=Math.floor(river+7);x<=Math.ceil(river+19);x++)
            if(nav.placement(x,z,.4).valid)options.push({x,z,
              bankDistance:Math.abs(x-(river+13))});
        }
        options.sort((a,b)=>Math.abs(a.z-targetZ)-Math.abs(b.z-targetZ)||
          a.bankDistance-b.bankDistance);
        if(options.length)corridorSeeds.push(options[0]);
      }
      assert.equal(corridorSeeds.length,3,
        'The real canyon terrain must offer three legal crop positions');
      {
        for(let x=-1;x<=1;x++)jobs.set(`${x},2`,
          {cx:x,cz:2,score:Math.hypot(x,2)});
        session.stream.plan(jobs);await session.stream.whenIdle();
        for(const [index,seed] of corridorSeeds.entries())
          assert.ok(Game.plant(state,`canyon-corridor-plant-${index}`,
            'mijo',seed.x,seed.z,nav));
        before=serialize(state);
        const regionPoints=[];
        for(let z=32;z<=68;z+=8)for(let x=-60;x<=20;x+=8)
          regionPoints.push({x,z});
        for(const species of ['warthog','hyena','buffalo','lion','rhino'])
          session.actorRegionsBatch(regionPoints,{worker:false,species});
        new Int32Array(wasm.memory.buffer,wasm.lazy_cut_seeds_ptr(3),6)
          .set(corridorSeeds.flatMap(p=>[p.x,p.z]));
        const corridorCount=wasm.lazy_local_crop_cut_conservative_buildable(
          -48,35,-5,70,3,2);
        const corridorEdges=corridorCount>=0?Array.from(new Int32Array(
          wasm.memory.buffer,wasm.lazy_local_crop_cut_ptr(),corridorCount*4)):[];
        const faceCount=wasm.lazy_local_crop_cut_boundary_count();
        const corridorBoundary=Array.from(new Int32Array(wasm.memory.buffer,
          wasm.lazy_local_crop_cut_boundary_ptr(),faceCount*4));
        const naturalFaces=[];
        for(let i=0;i<corridorBoundary.length;i+=4){
          const edge=corridorBoundary.slice(i,i+4);
          naturalFaces.push({edge,kind:wasm.lazy_cut_face_natural(...edge)});
        }
        const attackBuffer=wasm.lazy_cut_attack_points_ptr(corridorSeeds.length);
        new Float32Array(wasm.memory.buffer,attackBuffer,corridorSeeds.length*2)
          .set(corridorSeeds.flatMap(p=>[p.x,p.z]));
        const reach=Math.max(...Object.values(ANIMAL_SPATIAL_PROFILES)
          .map(p=>p.radius))+.65+AGRICULTURAL_PROFILE_LIMITS.attackRadius;
        const attackMargin=wasm.lazy_cut_attack_margin(corridorSeeds.length,reach);
        new Float32Array(wasm.memory.buffer,attackBuffer,2).set([-21.5,67.5]);
        assert.ok(wasm.lazy_cut_attack_margin(corridorSeeds.length,reach)<0,
          'A crop near the perimeter must not inherit the safe certificate');
        new Float32Array(wasm.memory.buffer,attackBuffer,corridorSeeds.length*2)
          .set(corridorSeeds.flatMap(p=>[p.x,p.z]));
        const corridorShape=corridorEdges.length?
          approximateCutModules(corridorEdges,state.structures,'zarzas',10):null;
        const corridorKind=corridorShape&&identifyNaturalCorridor(
          corridorShape.strokes,naturalFaces);
        const corridorQuote=corridorShape&&
          !corridorShape.ambiguous.length?Game.quoteWallChain(state,'zarzas',
            corridorShape.strokes,nav,{smooth:false,snap:false}):null;
        const workerRoutesBefore=corridorSeeds.map(p=>({
          outbound:!!nav.path(originalEntry,p,.28,null,true),
          return:!!nav.path(p,originalEntry,.28,null,true)}));
        const physical=corridorQuote?nav.withWallPreview(
          corridorQuote.previewPieces,corridorQuote.suppressed,()=>{
            const counts={solid:0,wetland:0,river:0,cliff:0,unproved:0};
            for(let i=0;i<corridorBoundary.length;i+=4){
              const code=wasm.lazy_cut_face_natural(...corridorBoundary.slice(i,i+4));
              if(code===1)counts.solid++;else if(code===2)counts.wetland++;
              else if(code===3)counts.river++;else if(code===4)counts.cliff++;
              else counts.unproved++;
            }
            return {faces:counts,workerRoutes:corridorSeeds.map(p=>({
              outbound:!!nav.path(originalEntry,p,.28,null,true),
              return:!!nav.path(p,originalEntry,.28,null,true)}))};
          },true):null;
        assert.equal(corridorCount,28);
        assert.equal(corridorKind?.kind,'natural-corridor');
        assert.deepEqual(corridorKind.barriers,['fluid','solid']);
        assert.equal(corridorShape.strokes.length,2);
        assert.equal(corridorQuote.pieces.length,14);
        assert.equal(corridorQuote.cost,140);
        assert.equal(corridorQuote.blockedPieces.length,0);
        assert.equal(corridorQuote.blockedCrops.length,0);
        assert.equal(corridorQuote.gates,0,
          'Do not add a gate when workers already have a physical crossing');
        assert.ok(physical.faces.river>0&&physical.faces.cliff>0);
        assert.equal(physical.faces.unproved,0,
          'Every boundary face needs a continuous native movement witness');
        assert.ok(attackMargin>0,
          'No exterior central or peripheral hit reaches these crop sites');
        assert.ok(physical.workerRoutes.every(p=>p.outbound&&p.return));
        const hybrid=proposeHybridEnclosure({state,nav,session,
          crops:corridorSeeds});
        assert.equal(hybrid.status,'protected',JSON.stringify(hybrid));
        assert.equal(hybrid.chosen.kind,'natural-corridor');
        const cropIds=state.plants.filter(plant=>corridorSeeds.some(seed=>
          Math.hypot(plant.x-seed.x,plant.z-seed.z)<.01)).map(plant=>plant.id);
        const group={id:'crop:canyon-corridor',cropIds,
          protection:'unprotected',
          bounds:{minX:-25,minZ:45,maxX:-19,maxZ:61},
          revision:{crops:1,topology:[]}};
        const advice={getUnprotectedCropGroups:()=>[group],
          getDamagedWalls:()=>[],getDamagedCenters:()=>[]};
        const integrated=createCropEnclosurePlanner(state,nav,advice,session)
          .planCropEnclosure(group.id,{method:'topological'});
        assert.equal(integrated.status,'ready');
        assert.equal(integrated.kind,'natural-corridor');
        assert.equal(integrated.cost,integrated.modules.length*10);
        assert.ok(integrated.cost>0&&integrated.cost<=140);
        const policyState=deserialize(serialize(state));
        const policyChunks=new Map();
        const policySession=createSpatialGameSession(module,policyState,{
          loaded:()=>policyChunks,onData:data=>
            policyChunks.set(`${data.cx},${data.cz}`,data)});
        try{
          policySession.stream.plan(jobs);await policySession.stream.whenIdle();
          const policyNav=createSpatialNavigationMovement(policySession,policyState);
          const policy=createNativeTopologicalDefensePolicy({session:policySession,
            advice,startDay:1,minimumReplanSeconds:0});
          policyState.ledger.balance=rational(100);
          assert.equal(policy.act(policyState,policyNav,{
            command:()=> 'canyon-policy-wall',reserve:0}),0);
          assert.equal(policy.report().history.at(-1).reason,
            'saving-for-complete-enclosure');
          assert.equal(policyState.structures.filter(item=>item.kind==='wall').length,0,
            'An unaffordable complete enclosure must not buy a fragment');
          policyState.ledger.balance=rational(500);
          policy.onWorldEvent({type:'CrateDelivered'},policyState);
          assert.equal(policy.act(policyState,policyNav,{
            command:()=> 'canyon-policy-wall',reserve:0}),1);
          assert.equal(policy.report().history.at(-1).kind,'natural-corridor');
          assert.equal(policyState.structures.filter(item=>item.kind==='wall').length,
            integrated.modules.length);
          assert.equal(policy.act(policyState,policyNav,{
            command:()=> 'ignored',reserve:0}),0,
            'No world event means no new enclosure planning');
        }finally{policySession.dispose();}
        assert.ok(workerRoutesBefore.every(p=>p.outbound&&p.return));
        const riverFace=naturalFaces.find(face=>face.kind===3&&
          Math.abs((face.edge[0]+face.edge[2])/2+24)>2&&
          Math.abs((face.edge[1]+face.edge[3])/2-24)>2);
        assert.ok(riverFace);
        const cx=Math.floor(((riverFace.edge[0]+riverFace.edge[2])/2+24)/48);
        const cz=Math.floor(((riverFace.edge[1]+riverFace.edge[3])/2+24)/48);
        assert.equal(session.stream.releaseChunk(cx,cz),1);
        loaded.delete(`${cx},${cz}`);
        assert.equal(wasm.lazy_cut_face_natural(...riverFace.edge),-1,
          'Unloading the supporting sector must invalidate the proof');
        session.stream.plan(jobs);await session.stream.whenIdle();
        assert.equal(wasm.lazy_cut_face_natural(...riverFace.edge),3);
        assert.equal(serialize(state),before);
        assert.ok(Game.buildWallChain(state,'canyon-corridor-paid',
          'zarzas',corridorShape.strokes,nav,{smooth:false,snap:false}));
        const paid=state.structures.filter(p=>p.kind==='wall'&&
          corridorQuote.pieces.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<.01));
        assert.equal(paid.length,14);
        const paidPlan=createCropEnclosurePlanner(state,nav,advice,session)
          .planCropEnclosure(group.id,{method:'topological'});
        assert.ok(['ready','protected'].includes(paidPlan.status),
          JSON.stringify(paidPlan));
        if(paidPlan.status==='ready'){
          assert.ok(paidPlan.modules.length<=2,
            'Only the clearance gap may need additional modules');
          assert.ok(Game.buildWallChain(state,'canyon-clearance-paid',
            'zarzas',paidPlan.points,nav,{smooth:false,snap:false,
              preparedPlan:paidPlan.preparedPlan}));
        }
        const closedPlan=createCropEnclosurePlanner(state,nav,advice,session)
          .planCropEnclosure(group.id,{method:'topological'});
        assert.equal(closedPlan.status,'protected',JSON.stringify(closedPlan));
        assert.equal(closedPlan.kind,'existing-closure');
        assert.ok(corridorBoundary.every((_,i)=>i%4!==0||
          wasm.lazy_cut_face_natural(...corridorBoundary.slice(i,i+4))>0));
        const restored=deserialize(serialize(state));
        const reloadChunks=new Map(),reloaded=createSpatialGameSession(module,
          restored,{loaded:()=>reloadChunks,onData:data=>
            reloadChunks.set(`${data.cx},${data.cz}`,data)});
        try{
          reloaded.stream.plan(jobs);await reloaded.stream.whenIdle();
          for(const species of ['warthog','hyena','buffalo','lion','rhino'])
            reloaded.actorRegionsBatch(regionPoints,{worker:false,species});
          assert.ok(corridorBoundary.every((_,i)=>i%4!==0||
            reloaded.core.wasm.lazy_cut_face_natural(
              ...corridorBoundary.slice(i,i+4))>0));
        }finally{reloaded.dispose();}
        const removed=paid.find(p=>Math.abs(p.z-67.5)<1&&
          Math.abs(p.x+28)<3)??paid[0];
        assert.ok(Game.removeWall(state,'canyon-corridor-breach',
          removed.id,nav));
        assert.ok(corridorBoundary.some((_,i)=>i%4===0&&
          wasm.lazy_cut_face_natural(...corridorBoundary.slice(i,i+4))===0),
        'A paid wall removal must invalidate the physical boundary');
        const rebuild=Game.quoteWallChain(state,'zarzas',
          corridorShape.strokes,nav,{smooth:false,snap:false});
        assert.equal(rebuild.pieces.length,1,
          'Reconstruction should reuse the other thirteen paid modules');
        assert.ok(Game.buildWallChain(state,'canyon-corridor-rebuild',
          'zarzas',corridorShape.strokes,nav,{smooth:false,snap:false,
            preparedPlan:rebuild}));
        assert.ok(corridorBoundary.every((_,i)=>i%4!==0||
          wasm.lazy_cut_face_natural(...corridorBoundary.slice(i,i+4))>0),
        'Rebuilding the missing module restores the physical closure');
      }
    }finally{session.dispose();}
  });
