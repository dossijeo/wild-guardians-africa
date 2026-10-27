import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {TerrainField} from '../src/world/terrain.js';
import {createSpatialTerrainView} from '../src/world/wild-engine/spatial-terrain-view.js';
import {spatialCanyonLayout} from '../src/world/wild-engine/spatial-canyon-layout.js';

const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const make=open=>{const core=createSpatialWorld(module);core.generate(712,0,0,'canyons',{canyonOpenRight:open});for(const cz of [-1,0,1])for(const cx of [-2,-1,0,1,2])if(cx||cz)core.addChunk(cx,cz);return core;};

test('experimental canyon east plateau changes authoritative terrain and movement, while west cliff remains',()=>{
  const original=make(false),open=make(true),river=open.riverCenter(0);
  const east=river+39,west=river-39;
  assert(original.surface(east,0)-open.surface(east,0)>15,'east cliff must become low playable ground');
  assert(Math.abs(original.surface(west,0)-open.surface(west,0))<.001,'west cliff remains');
  for(const core of [original,open]){
    core.buildNavigation(1.1,false);
    assert.equal(core.walkable(river,0),false,'animals still cannot cross the river');
  }
  assert(open.walkable(east,0),'east plateau must be traversable by animals');
  for(const z of [-40,-20,0,20,40]){
    const r=open.riverCenter(z);
    assert(open.surface(r-39,z)-open.surface(r+39,z)>15,
      'remaining west cliff must remain elevated along the corridor');
  }
  let landmarks=0;
  for(const cz of [-1,0,1])for(const cx of [-2,-1,0,1,2]){
    open.selectChunk(cx,cz);
    const props=open.props();
    const visible=open.chunkPayload().instances.reduce((total,slot)=>total+slot.length,0);
    assert.equal(props.length,visible,'native collision and visible prop lists must match per chunk');
    for(const prop of props)if(prop.group===5){
      landmarks++;
      assert(prop.x<open.riverCenter(prop.z),
        'large cliff landmarks must not leave invisible east-bank collision geometry');
    }
  }
  assert(landmarks>0,'the remaining west wall retains geological landmarks');
  const visual=new TerrainField({seed:'712',biome:'canyons',river:true,relief:1,canyonOpenRight:true});
  const standard=new TerrainField({seed:'712',biome:'canyons',river:true,relief:1});
  const visualRiver=visual.riverX(0);
  assert(standard.surface(visualRiver+39,0)-visual.surface(visualRiver+39,0)>15);
  assert(Math.abs(standard.surface(visualRiver-39,0)-visual.surface(visualRiver-39,0))<.001);
});

test('one-wall canyon permits a native animal route on the opened bank and locates the village there',()=>{
  const core=make(true);
  for(const cz of [-2,-1,1,2])for(const cx of [-2,-1,0,1,2])core.addChunk(cx,cz);
  core.buildNavigation(1.1,false);
  const route=core.routeWorldNative({x:15,z:0},{x:15,z:6});
  assert.equal(route.status,'found',`east-bank route: ${route.reason}`);
  assert(route.points.length>0);
  const unit={key:'hut',kind:'house',min:[-.5,0,-.5],max:[.5,1,.5]};
  const layout=spatialCanyonLayout({id:'mapungubwe',units:[unit,unit]},
    createSpatialTerrainView(core),0,{canyonOpenRight:true});
  for(const building of [...layout.buildings,layout.center])
    assert(building.x>core.riverCenter(building.z)+3,
      'village building and work center must stand on the playable east bank');
});
