// QA-only observer. Call observe after a game step; it does no navigation work
// unless a raid starts/ends or physical topology changes during that raid.
import {ANIMAL_SPATIAL_PROFILES} from '../../src/world/hierarchical-wasm/spatial-movement-profiles.js';

const point=p=>({x:p.x,z:p.z});
const eventNumber=event=>Number(event.id?.match(/^event-(\d+)$/)?.[1]??-1);
const live=state=>state.plants.filter(plant=>plant.alive);
const distinct=values=>[...new Set(values)];

export class EnclosureBalanceObserver {
  constructor({session=null}={}){
    this.session=session;
    this.lastEvent=-1;this.raid=null;this.topology=null;this.previous=new Map();
    this.previousWalls=null;
    this.samples=[];this.counters={samples:0,plantsClassified:0,regionBatches:0,
      enclosureQueries:0,connectivityQueries:0,unknownRegions:0,elapsedMs:0};
  }
  observe(state,nav){
    const events=state.events.filter(event=>eventNumber(event)>this.lastEvent);
    if(state.events.length)this.lastEvent=eventNumber(state.events.at(-1));
    const spawn=events.some(event=>event.type==='RaidSpawned'||event.type==='RaidWaveSpawned');
    const ended=events.some(event=>event.type==='RaidEnded');
    const active=state.raid;
    if(active){this.raid=active;}
    const actors=active?.animals??this.raid?.animals??[];
    if(!actors.length)return null;
    const topology=nav.version;
    if(!spawn&&!ended&&topology===this.topology)return null;
    const reason=ended?'end':spawn?'spawn':this.topology===null?'initial':'topology';
    const result=this.sample(state,nav,actors,reason);
    this.topology=topology;
    if(ended){this.raid=null;this.previous.clear();this.previousWalls=null;this.topology=null;}
    return result;
  }
  sample(state,nav,actors,reason='manual'){
    const start=performance.now(),plants=live(state),byId=new Map(),profiles=[];
    const species=distinct(actors.map(actor=>actor.species)).filter(id=>ANIMAL_SPATIAL_PROFILES[id]);
    for(const id of species){
      const radius=ANIMAL_SPATIAL_PROFILES[id].radius;
      const cohort=actors.filter(actor=>actor.species===id&&actor.status!=='gone');
      // At the end all bodies may be gone; their original exterior births are
      // still the reference for final enclosure exposure.
      const origins=(cohort.length?cohort:actors.filter(actor=>actor.species===id))
        .map(actor=>actor.spawn??actor);
      const batch=this.session?.actorRegionsBatch?.(plants.map(point),{worker:false,species:id});
      if(batch)this.counters.regionBatches++;
      const groups=new Map();
      for(let i=0;i<plants.length;i++){
        const plant=plants[i],raw=batch?.[i]??nav.regionFor?.(plant,radius,null,false);
        const ids=raw?.ids??[],key=raw?.unknown||!ids.length?null:ids.slice().sort((a,b)=>a-b).join('|');
        if(!key){this.counters.unknownRegions++;byId.set(`${id}:${plant.id}`,'unknown');continue;}
        if(!groups.has(key))groups.set(key,[]);
        groups.get(key).push(plant);
      }
      const counts={protected:0,exposed:0,open:0,unknown:0};
      for(const [key,members] of groups){
        const representative=members[0];
        const enclosure=nav.enclosureFor?.(representative,radius)??{status:'unknown'};
        this.counters.enclosureQueries++;
        let status='unknown';
        if(enclosure.status==='open-frontier')status='open';
        else if(enclosure.status==='sealed'){
          let possible=false,unresolved=false;
          const originKeys=new Set();
          for(const origin of origins){
            const originRegion=nav.regionFor?.(origin,radius,null,false)?.key??`${origin.x},${origin.z}`;
            if(originKeys.has(originRegion))continue;
            originKeys.add(originRegion);
            const connected=nav.regionConnected?.(origin,representative,radius,null,false);
            this.counters.connectivityQueries++;
            if(connected===true){possible=true;break;}
            if(connected==null)unresolved=true;
          }
          status=possible?'exposed':unresolved||!origins.length?'unknown':'protected';
        }
        counts[status]+=members.length;
        for(const plant of members)byId.set(`${id}:${plant.id}`,status);
      }
      counts.unknown+=plants.length-counts.protected-counts.exposed-counts.open-counts.unknown;
      profiles.push({species:id,radius,origins:origins.length,regions:groups.size,crops:plants.length,...counts});
      this.counters.plantsClassified+=plants.length;
    }
    let newlyExposed=0,stillProtected=0,previousProtected=0;
    for(const [key,old] of this.previous)if(old==='protected'){
      previousProtected++;
      const next=byId.get(key);
      if(next==='exposed'||next==='open')newlyExposed++;
      if(next==='protected')stillProtected++;
    }
    this.previous=byId;
    const walls=new Set(state.structures.filter(o=>o.kind==='wall'&&o.status!=='ruined').map(o=>o.id));
    const removedWalls=this.previousWalls?[...this.previousWalls].filter(id=>!walls.has(id)):[];
    this.previousWalls=walls;
    const row={reason,raidId:state.raid?.id??this.raid?.id??null,day:state.day,
      elapsed:state.elapsed,topology:nav.version,profiles,
      transition:{previousProtected,newlyExposed,stillProtected,removedWalls,
        breachExposure:removedWalls.length>0?newlyExposed:0},
      wallCount:walls.size,
      livingCrops:plants.length,elapsedMs:performance.now()-start};
    this.samples.push(row);this.counters.samples++;this.counters.elapsedMs+=row.elapsedMs;
    return row;
  }
  report(){return {samples:this.samples,counters:{...this.counters}};}
}
