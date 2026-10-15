import test from 'node:test';
import assert from 'node:assert/strict';
import {targetFor,reachableApproach} from '../src/simulation/raids.js';
import {raidResidentDemand} from '../src/world/raid-entry-residency.js';

function fixture(){
  const animal={id:'animal-1',species:'warthog',x:0,z:0,radius:1.1,hitsRemaining:2,
    status:'waiting',spawn:{x:0,z:0},exit:{x:0,z:-3}};
  const plants=Array.from({length:100},(_,i)=>({id:`plant-${i}`,species:'mijo',
    x:10+(i%10),z:Math.floor(i/10),alive:true,growth:30}));
  const state={plants,structures:[],spells:[],workers:[],elapsed:0,
    raid:{animals:[animal],reservations:{},waitRevision:0}};
  let connectivity=null,sectors=0,queries=0,routes=0;
  const nav={state,version:1,residencyRevision:0,raidSelectionStats:{},
    regionFor:point=>({key:point===animal?'origin':'crop',ids:[1]}),
    spatialSectorRevision:()=>sectors,
    regionConnected:()=>{queries++;return connectivity;},
    requestRaidConnectivity:()=>{},
    walkable:()=>true,
    approachPath:(_start,end)=>{routes++;return [{x:end.x,z:end.z}];}};
  return {animal,plants,state,nav,
    setConnectivity:value=>{connectivity=value;},advanceSector:()=>{sectors++;},
    queries:()=>queries,routes:()=>routes};
}

test('raid region decisions follow native chunk residency even without a sector update',()=>{
  const f=fixture();f.setConnectivity(true);
  assert.equal(targetFor(f.state,f.animal,f.nav)?.target.id,f.plants[0].id);
  const residentQueries=f.queries();
  f.setConnectivity(null);f.nav.residencyRevision++;
  assert.deepEqual(targetFor(f.state,f.animal,f.nav),{unknown:true});
  assert(f.queries()>residentQueries,'the unloaded region must be queried again');
  f.setConnectivity(true);f.nav.residencyRevision++;
  assert.equal(targetFor(f.state,f.animal,f.nav)?.target.id,f.plants[0].id);
});

test('crop-to-region membership follows residency without a topology change',()=>{
  const f=fixture();f.setConnectivity(false);
  let destination='resident-region';
  f.nav.regionFor=point=>({key:point===f.animal?'origin':destination,ids:[1]});
  assert.equal(targetFor(f.state,f.animal,f.nav),null);
  const originalQueries=f.queries();
  destination='reloaded-region';f.setConnectivity(true);
  f.nav.residencyRevision++;
  assert.equal(targetFor(f.state,f.animal,f.nav)?.target.id,f.plants[0].id);
  assert(f.queries()>originalQueries);
});

test('a native blocked service region skips detailed routes without hiding a reachable alternative',()=>{
  const animal={id:'animal',x:0,z:0,radius:1.1};
  const target={id:'structure',kind:'wall',x:4,z:0};
  let routes=0,checks=0;
  const nav={walkable:()=>true,regionConnected:(_start,point)=>{
    checks++;return point.x<2.1?false:true;
  },approachPath:(_start,point)=>{routes++;return [{x:point.x,z:point.z}];}};
  const selected=reachableApproach(animal,target,nav);
  assert(selected?.point);
  assert(checks>=2);
  assert.equal(routes,1);
});

test('unknown service connectivity still asks the native router',()=>{
  const animal={id:'animal',x:0,z:0,radius:1.1};
  const target={id:'plant',x:2,z:0};
  let routes=0;
  const nav={walkable:()=>true,regionConnected:()=>null,
    approachPath:(_start,point)=>{routes++;return [{x:point.x,z:point.z}];}};
  assert(reachableApproach(animal,target,nav)?.point);
  assert.equal(routes,1);
});

test('shared service-region decision is refreshed after a sector revision',()=>{
  const animal={id:'animal',x:0,z:0,radius:1.1};
  const target={id:'wall',kind:'wall',x:4,z:0};
  const scope={decisions:new Map()};
  let connected=false,queries=0,routes=0;
  const nav={walkable:()=>true,regionFor:()=>({key:'destination'}),
    regionConnected:()=>{queries++;return connected;},
    approachPath:(_start,point)=>{routes++;return [{x:point.x,z:point.z}];}};
  const decision=sectors=>({scope,origin:'origin',sectors});
  assert.equal(reachableApproach(animal,target,nav,null,null,decision(1)),null);
  const firstQueries=queries;
  assert.equal(reachableApproach(animal,target,nav,null,null,decision(1)),null);
  assert.equal(queries,firstQueries,'same regions must reuse the decision');
  connected=true;
  assert(reachableApproach(animal,target,nav,null,null,decision(2))?.point);
  assert(queries>firstQueries,'topology update must ask the native graph again');
  assert.equal(routes,1);
});

test('an unresolved crop region remains pending without enumerating its hundred plants',()=>{
  const f=fixture();
  for(let tick=0;tick<50;tick++){
    f.state.elapsed=tick;
    assert.deepEqual(targetFor(f.state,f.animal,f.nav),{unknown:true});
  }
  assert.equal(f.routes(),0);
  assert(f.queries()<20,`repeated region queries: ${f.queries()}`);
  assert.equal(f.nav.raidSelectionStats.cropAttempts??0,0);
});

test('unloaded crop components stay grouped instead of becoming one query per plant',()=>{
  const f=fixture();f.nav.regionFor=()=>null;
  assert.deepEqual(targetFor(f.state,f.animal,f.nav),{unknown:true});
  assert.equal(f.queries(),1);
  assert.equal(f.routes(),0);
});

test('separate crop groups in one native region share a connectivity decision',()=>{
  const f=fixture();
  f.state.plants=[...f.plants,{id:'distant-crop',species:'mijo',x:100,z:0,
    alive:true,growth:30}];
  assert.deepEqual(targetFor(f.state,f.animal,f.nav),{unknown:true});
  assert.equal(f.queries(),1);
});

test('native group decisions are capped per tick and continue on later ticks',()=>{
  const f=fixture();f.state.plants=f.plants.slice(0,30).map((plant,i)=>({...plant,x:20+i*10,z:0}));
  f.nav.regionFor=point=>({key:point===f.animal?'origin':`crop:${point.x}`,
    ids:[1]});
  assert.deepEqual(targetFor(f.state,f.animal,f.nav),{unknown:true});
  assert.equal(f.queries(),16);
  f.state.elapsed++;
  targetFor(f.state,f.animal,f.nav);
  assert(f.queries()>16,'deferred groups should be resumed next tick');
  assert(f.queries()<=32);
});

test('a newly resolved native region permits a concrete individually reserved crop',()=>{
  const f=fixture();
  assert.deepEqual(targetFor(f.state,f.animal,f.nav),{unknown:true});
  f.setConnectivity(true);f.advanceSector();
  const selected=targetFor(f.state,f.animal,f.nav);
  assert.equal(selected.target.id,f.plants[0].id);
  assert.equal(selected.reservation,`crop:${f.plants[0].id}`);
  assert(f.routes()>0);
});

test('native proof of a blocked crop region does not make an unknown barrier attackable',()=>{
  const f=fixture();f.setConnectivity(false);
  const wall={id:'wall-1',kind:'wall',x:5,z:0,yaw:Math.PI/2,baseScaleX:1,
    material:'zarzas',status:'intact',hp:100,cost:50,gate:false};
  f.state.structures.push(wall);
  // The graph has not certified either side of this wall. The crop region is
  // blocked, but that alone cannot promote an arbitrary wall to a target.
  const chosen=targetFor(f.state,f.animal,f.nav);
  assert.equal(chosen,null);
  assert.equal(f.routes(),0);
});

test('a wall is selected only when it borders a sealed native crop region',()=>{
  const f=fixture();
  f.state.structures.push({id:'wall-1',kind:'wall',x:5,z:0,yaw:Math.PI/2,
    baseScaleX:1,material:'zarzas',status:'intact',hp:100,cost:50,gate:false});
  f.nav.regionConnected=(from,to)=>{
    if(from===f.animal&&to.x>=10)return null;
    return from.x<5&&to.x<5||from.x>5&&to.x>5;
  };
  f.nav.enclosureFor=point=>point.x>5?
    {ids:[2],status:'sealed'}:{ids:[1],status:'open-frontier'};
  const selected=targetFor(f.state,f.animal,f.nav);
  assert.equal(selected?.target.id,'wall-1');
  assert.equal(selected.reservation,'structure:wall-1');
  assert(f.routes()>0);
});

test('natural isolation without a wall on the native region boundary cannot nominate a wall',()=>{
  const f=fixture();f.setConnectivity(false);
  f.nav.enclosureFor=point=>point.x>5?
    {ids:[2],status:'sealed'}:{ids:[1],status:'open-frontier'};
  f.state.structures.push({id:'distant-wall',kind:'wall',x:-5,z:0,yaw:Math.PI/2,
    baseScaleX:1,material:'zarzas',status:'intact',hp:100,cost:50,gate:false});
  assert.equal(targetFor(f.state,f.animal,f.nav),null);
});

test('a disconnected wall graph nominates only a reachable wall crossed toward a sealed crop',()=>{
  const f=fixture();f.state.plants=[{...f.plants[0],x:20,z:0}];
  const wall=(id,z)=>({id,kind:'wall',x:5,z,yaw:Math.PI/2,
    baseScaleX:1,material:'zarzas',status:'intact',hp:100,cost:10,gate:false});
  f.state.structures.push(wall('unrelated',8));
  f.nav.regionConnected=(_from,to)=>to.x<5;
  f.nav.enclosureFor=point=>point.x>10?{ids:[3],status:'sealed'}:
    point.x>5?{ids:[2],status:'sealed'}:{ids:[1],status:'open-frontier'};
  assert.equal(targetFor(f.state,f.animal,f.nav),null);
  f.state.structures.push(wall('crossing',0));f.nav.version++;
  assert.equal(targetFor(f.state,f.animal,f.nav)?.target.id,'crossing');
});

test('an open-frontier region never licenses a wall attack',()=>{
  const f=fixture();f.setConnectivity(null);
  f.nav.enclosureFor=()=>({ids:[2],status:'open-frontier'});
  f.state.structures.push({id:'wall-1',kind:'wall',x:5,z:0,yaw:Math.PI/2,
    baseScaleX:1,material:'zarzas',status:'intact',hp:100,cost:50,gate:false});
  assert.deepEqual(targetFor(f.state,f.animal,f.nav),{unknown:true});
});

test('a nested crop enclosure nominates its reachable outer wall first',()=>{
  const f=fixture();
  f.state.plants=f.plants.map(plant=>({...plant,x:20+plant.x-10}));
  const wall=x=>({id:x===5?'outer-wall':'inner-wall',kind:'wall',x,z:0,
    yaw:Math.PI/2,baseScaleX:1,material:'zarzas',status:'intact',hp:100,
    cost:50,gate:false});
  f.state.structures.push(wall(5),wall(15));
  f.nav.regionFor=point=>({key:point===f.animal?'outside':'crop',ids:[1]});
  f.nav.regionConnected=(_from,to)=>to.x<5?true:null;
  f.nav.enclosureFor=point=>point.x<5?
    {ids:[1],status:'open-frontier'}:point.x<15?
      {ids:[2],status:'sealed'}:{ids:[3],status:'sealed'};
  const chosen=targetFor(f.state,f.animal,f.nav);
  assert.equal(chosen?.target?.id,'outer-wall');
});

test('animals in one origin region reuse the same reachable wall-side decision',()=>{
  const f=fixture(),other={...f.animal,id:'animal-2'};
  f.state.raid.animals.push(other);
  f.state.structures.push({id:'wall-1',kind:'wall',x:5,z:0,yaw:Math.PI/2,
    baseScaleX:1,material:'zarzas',status:'intact',hp:100,cost:50,gate:false});
  f.nav.regionFor=point=>({key:point.species==='warthog'?'origin':'crop',ids:[1]});
  let queries=0;
  f.nav.regionConnected=(_from,to)=>{queries++;return to.x<5?true:null;};
  f.nav.enclosureFor=()=>({ids:[1],status:'open-frontier'});
  const first=targetFor(f.state,f.animal,f.nav);
  const afterFirst=queries;
  const second=targetFor(f.state,other,f.nav);
  assert.equal(first?.target?.id,'wall-1');
  assert.equal(second?.target?.id,'wall-1');
  assert.equal(queries,afterFirst,'the second animal reuses crop and wall-side topology');
});

test('an alternative native access to crops retains crop-first selection',()=>{
  const f=fixture();f.setConnectivity(true);
  f.state.structures.push({id:'wall-1',kind:'wall',x:5,z:0,yaw:Math.PI/2,
    baseScaleX:1,material:'zarzas',status:'intact',hp:100,cost:50,gate:false});
  assert.equal(targetFor(f.state,f.animal,f.nav)?.target.id,f.plants[0].id);
});

test('an accessible second plantation wins over attacking a sealed first plantation',()=>{
  const f=fixture(),open={id:'open-crop',species:'mijo',x:-4,z:5,alive:true,growth:30};
  f.state.plants=[...f.plants,open];
  f.state.structures.push({id:'wall-1',kind:'wall',x:5,z:0,yaw:Math.PI/2,
    baseScaleX:1,material:'zarzas',status:'intact',hp:100,cost:50,gate:false});
  f.nav.regionFor=point=>({key:point===f.animal?'origin':point.x<0?'open':'sealed',ids:[1]});
  f.nav.regionConnected=(_from,to)=>to.x<0?true:false;
  f.nav.enclosureFor=point=>point.x<5?
    {ids:[1],status:'open-frontier'}:{ids:[2],status:'sealed'};
  assert.equal(targetFor(f.state,f.animal,f.nav)?.target?.id,open.id);
});

test('opening a breach invalidates the previous region decision',()=>{
  const f=fixture();f.setConnectivity(false);
  assert.equal(targetFor(f.state,f.animal,f.nav),null);
  f.setConnectivity(true);f.nav.version++;
  assert.equal(targetFor(f.state,f.animal,f.nav)?.target.id,f.plants[0].id);
});

test('bounded connectivity chunk demand is retained only during its raid',()=>{
  const f=fixture();
  f.nav.raidConnectivityDemand=new Set(['2,3','3,3']);
  assert(raidResidentDemand(f.state,f.nav).has('2,3'));
  f.state.raid=null;
  assert.equal(raidResidentDemand(f.state,f.nav).size,0);
});
