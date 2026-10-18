// QA-only hybrid probe. It leaves native gameplay intact: unproved or invalid
// WASM routes use the existing navigator. This is for sustained cost accounting,
// not the final navigation architecture.
import {Navigation} from '../../src/world/navigation.js';
import {createHierarchicalNavigationAdapter} from '../../src/world/hierarchical-navigation-adapter.js';
import {createLazySectorProbeSync} from '../../src/world/wild-engine/lazy-sectors-adapter.js';

export function installSparseWasmCampaignHook(module){
  const original={path:Navigation.prototype.path,regionFor:Navigation.prototype.regionFor,
    regionConnected:Navigation.prototype.regionConnected};
  const totals={requests:0,direct:0,wasmFound:0,wasmUnknown:0,wasmBlocked:0,wasmInvalid:0,
    noConnectors:0,noSource:0,noTarget:0,certifiedNoConnector:0,fallbacks:0,fallbackFound:0,
    wasmMs:0,fallbackMs:0,profiles:0,byProfile:{},examples:[]};
  const owners=new WeakSet();
  const allProbes=[];
  function install(nav){
    if(owners.has(nav))return;
    const legacy=createHierarchicalNavigationAdapter(nav),probes=new Map();
    const profile=(radius,worker,ignore)=>{
      const key=`${worker}:${radius}:${ignore??''}`;
      if(!probes.has(key)){
        const probe=createLazySectorProbeSync(module,nav,{sectorSize:12,radius,worker,ignore});
        probes.set(key,probe);allProbes.push(probe);
        totals.profiles++;
      }
      return probes.get(key);
    };
    const connector=(point,radius,worker,ignore,outward)=>{
      const x=Math.round(point.x),z=Math.round(point.z),cells=[];
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
        const cell={x:x+dx,z:z+dz};
        if(!nav.walkable(cell.x,cell.z,radius,ignore,worker))continue;
        if(!nav.segmentClear(outward?point:cell,outward?cell:point,radius,ignore,worker))continue;
        cells.push({cell,distance:Math.hypot(cell.x-point.x,cell.z-point.z)});
      }
      return cells.sort((a,b)=>a.distance-b.distance||a.cell.x-b.cell.x||a.cell.z-b.cell.z).slice(0,3);
    };
    nav._hierarchical={
      region:legacy.region,connected:legacy.connected,
      clear(){legacy.clear();for(const probe of probes.values())probe.clear();},
      invalidateRect(...rect){legacy.invalidateRect(...rect);for(const probe of probes.values())probe.invalidateRect(...rect);},
      path(start,end,radius=.3,ignore=null,worker=true,margin=32){
        totals.requests++;
        const profileKey=`${worker?'worker':'animal'}:${radius}:${ignore??''}`;
        const profileStats=totals.byProfile[profileKey]??={requests:0,direct:0,wasmFound:0,unknown:0,blocked:0,
          noSource:0,noTarget:0,fallbacks:0,fallbackFound:0};
        profileStats.requests++;
        const began=performance.now();
        if(nav.segmentClear(start,end,radius,ignore,worker)){
          totals.direct++;profileStats.direct++;totals.wasmMs+=performance.now()-began;return [{x:end.x,z:end.z}];
        }
        const probe=profile(radius,worker,ignore);
        const sources=connector(start,radius,worker,ignore,true);
        const targets=connector(end,radius,worker,ignore,false);
        if(!sources.length||!targets.length){
          totals.noConnectors++;
          if(!sources.length){totals.noSource++;profileStats.noSource++;}
          if(!targets.length){totals.noTarget++;profileStats.noTarget++;}
          if(totals.examples.length<20)totals.examples.push({profile:profileKey,start:{x:start.x,z:start.z},end:{x:end.x,z:end.z},
            noSource:!sources.length,noTarget:!targets.length,sourceWalkable:nav.walkable(start.x,start.z,radius,ignore,worker),
            targetWalkable:nav.walkable(end.x,end.z,radius,ignore,worker)});
          // The existing JS navigator uses the same 3x3 endpoint connector
          // predicate and returns null before searching when either is empty.
          totals.certifiedNoConnector++;
          totals.wasmMs+=performance.now()-began;
          return null;
        }
        let unknown=false,blocked=false;
        for(const source of sources)for(const target of targets){
          probe.ensureSector(Math.floor(source.cell.x/12),Math.floor(source.cell.z/12));
          probe.ensureSector(Math.floor(target.cell.x/12),Math.floor(target.cell.z/12));
          const result=probe.route(source.cell,target.cell);
          if(result.status==='unknown'){unknown=true;continue;}
          if(result.status==='blocked'){blocked=true;continue;}
          const route=[source.cell,...result.points,{x:end.x,z:end.z}];
          let previous=start,valid=true;
          for(const point of route){
            if(!nav.segmentClear(previous,point,radius,ignore,worker)){valid=false;break;}
            previous=point;
          }
          if(valid){totals.wasmFound++;profileStats.wasmFound++;totals.wasmMs+=performance.now()-began;return route;}
          totals.wasmInvalid++;
        }
        if(unknown){totals.wasmUnknown++;profileStats.unknown++;}
        else if(blocked){totals.wasmBlocked++;profileStats.blocked++;}
        totals.wasmMs+=performance.now()-began;
        const fallbackStart=performance.now(),result=legacy.path(start,end,radius,ignore,worker,margin);
        totals.fallbacks++;profileStats.fallbacks++;
        if(result){totals.fallbackFound++;profileStats.fallbackFound++;}
        totals.fallbackMs+=performance.now()-fallbackStart;
        return result;
      },
    };
    owners.add(nav);
  }
  Navigation.prototype.path=function(...args){install(this);return original.path.call(this,...args);};
  Navigation.prototype.regionFor=function(...args){install(this);return original.regionFor.call(this,...args);};
  Navigation.prototype.regionConnected=function(...args){install(this);return original.regionConnected.call(this,...args);};
  return {metrics:()=>{
    const sectors=allProbes.map(p=>p.metrics());
    return {...totals,byProfile:structuredClone(totals.byProfile),examples:structuredClone(totals.examples),
      sectorsLoaded:sectors.reduce((n,s)=>n+s.loaded,0),
      sectorUpdates:sectors.reduce((n,s)=>n+s.updates,0),
      wasmReservedBytes:sectors.reduce((n,s)=>n+s.memoryBytes,0)};
  },uninstall(){Object.assign(Navigation.prototype,original);}};
}
