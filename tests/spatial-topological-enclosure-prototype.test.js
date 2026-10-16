import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {cropClearanceHull,cutEdgesToStrokes,enclosureJunctions,inspectNaturalJunctions,
  inspectPlacedNaturalJunctions,inspectSelfClosedQuote,
  inspectStaticCutBoundary,junctionBlocksSmallestAnimal,
  placedEnclosureJunctions,
  SMALLEST_ANIMAL_RADIUS,stitchTwoCutStrokes} from '../src/world/hierarchical-wasm/spatial-topological-enclosure-prototype.js';
import {villageLayout} from '../src/world/villages.js';
import {containsPoint} from '../src/world/footprints.js';
import {Navigation} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';

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
  assert.equal(inspectSelfClosedQuote(quote,[],[{x:0,z:0}]).status,
    'closed-wall-loop');
  assert.equal(inspectSelfClosedQuote({...quote,blockedPieces:[walls[0]]},[],
    [{x:0,z:0}]).status,'open');
  assert.equal(inspectSelfClosedQuote({...quote,previewPieces:walls.map(p=>
    ({...p,gate:false}))},[],[{x:0,z:0}]).status,'closed-without-gate');
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
  assert.equal(state.ledger.entries['two-strokes'].n,String(-quote.cost));
  assert.equal(serialize(deserialize(serialize(state))),serialize(state));
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
});

const path=process.env.WILD_ENGINE_TOPOLOGICAL_CUT_WASM;
const module=path?new WebAssembly.Module(readFileSync(path)):null;
const pack=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url),'utf8'))[0];
if(module&&WebAssembly.Module.imports(module).some(item=>item.module==='wasi_snapshot_preview1')){
  const Instance=WebAssembly.Instance;
  WebAssembly.Instance=function(mod,imports){return new Instance(mod,{
    ...imports,wasi_snapshot_preview1:{proc_exit(code){throw Error(`WASM exited: ${code}`);}}});};
}
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
