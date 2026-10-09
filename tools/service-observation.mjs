// Observer-owned scalars only. No game/navigation imports, commands or RNG.
export function createServiceObservation(){
 const records=new Map(),days=new Map(),seenEvents=new Set(),frames=[],gaps=[],decisions=[];
 let previous=null;
 const dayRow=day=>{if(!days.has(day))days.set(day,{day,contiguousDaylightSeconds:0,phaseActorSeconds:{},movement:{},taskQueueActorSeconds:{},peaks:{},firstObservedDelivery:null});return days.get(day);};
 const add=(obj,key,value)=>obj[key]=(obj[key]??0)+value;
 const phase=w=>w.status+':'+(w.taskKind??(w.crateId?'crate':'none'));
 const pathLength=w=>{let x=w.x,z=w.z,length=0;for(const p of w.path??[]){length+=Math.hypot(p.x-x,p.z-z);x=p.x;z=p.z;}return length;};
 function observe(s){
  const taskMap=new Map(s.tasks.map(t=>[t.id,t]));
  const current={day:s.day,time:s.time,elapsed:s.elapsed,raid:Boolean(s.raid),
   tasks:s.tasks.map(t=>({id:t.id,kind:t.kind,targetId:t.targetId,created:t.created,workerId:t.workerId,blocked:Boolean(t.blocked)})),
   workers:s.workers.map(w=>({id:w.id,contractDay:w.contractDay,status:w.status,x:w.x,z:w.z,taskId:w.taskId,taskKind:taskMap.get(w.taskId)?.kind??null,crateId:w.crateId,
    actionRemaining:w.actionRemaining,pathNull:w.path===null,pathPoints:w.path?.length??0,pathRemainingMetres:pathLength(w),pathVersion:w.pathVersion??null,
    gateWaiting:w.gateWaiting??null,fallRemaining:w.fallRemaining??null,incapacitated:Boolean(w.incapacitated),
    running:w.running??null,runRemaining:w.runRemaining??null,terrainAvoidanceCount:w.terrainAvoidance?.length??null})),
   live:s.plants.filter(p=>p.alive).length,firstWaterPending:s.plants.filter(p=>p.alive&&p.water[0].status==='due').length};
  const row=dayRow(s.day),fresh=s.events.filter(e=>!seenEvents.has(e.id));for(const e of fresh)seenEvents.add(e.id);
  const dt=previous?current.elapsed-previous.elapsed:0;
  if(dt<0)throw Error('Non-monotonic observation clock');
  if(previous&&dt>5.00000001)gaps.push({from:previous.elapsed,to:current.elapsed,seconds:dt});
  if(previous&&dt>0&&dt<=5.00000001&&previous.day===current.day&&previous.time<300&&current.time<=300&&!previous.raid&&!current.raid){
   row.contiguousDaylightSeconds+=dt;
   const people=new Map(current.workers.map(w=>[w.id,w]));
   for(const w of previous.workers){
    if(w.contractDay!==previous.day)continue;
    const key=phase(w);add(row.phaseActorSeconds,key,dt);
    const next=people.get(w.id);if(!next)continue;
    const movement=row.movement[key]??={observedActorSeconds:0,displacementMetres:0,zeroDisplacementSeconds:0,pathNullSeconds:0,gateWaitingSeconds:0,fallSeconds:0};
    const metres=Math.hypot(next.x-w.x,next.z-w.z);movement.observedActorSeconds+=dt;movement.displacementMetres+=metres;
    if(metres<1e-9)movement.zeroDisplacementSeconds+=dt;
    if(w.pathNull)movement.pathNullSeconds+=dt;if(w.gateWaiting===true)movement.gateWaitingSeconds+=dt;if(w.fallRemaining>0)movement.fallSeconds+=dt;
   }
   for(const t of previous.tasks){
    const r=records.get(t.id),kind=t.kind+':'+(t.workerId?'reserved':'unreserved');add(row.taskQueueActorSeconds,kind,dt);
    if(r){add(r.daylightSeconds,t.workerId?'reserved':'unreserved',dt);if(t.blocked)add(r.daylightSeconds,'blocked',dt);}
   }
  }
  for(const t of current.tasks){
   let r=records.get(t.id);
   if(!r){r={...t,firstObservedAt:current.elapsed,firstObservedDay:current.day,firstAppearanceInterval:[previous?.elapsed??null,current.elapsed],creationTimestamp:'not-in-state',lastObservedAt:current.elapsed,firstReservationInterval:null,daylightSeconds:{unreserved:0,reserved:0,blocked:0},removal:null};records.set(t.id,r);}
   r.lastObservedAt=current.elapsed;
   if(t.workerId&&!r.firstReservationInterval)r.firstReservationInterval=[previous?.elapsed??null,current.elapsed];
  }
  const present=new Set(current.tasks.map(t=>t.id));
  for(const t of previous?.tasks??[])if(!present.has(t.id)){
   const r=records.get(t.id);if(!r||r.removal)continue;
   const wanted=t.kind==='initial'||t.kind==='water'?'WaterSatisfied':t.kind==='harvest'?'CropPicked':t.kind==='repair'?'RepairApplied':null;
   const event=wanted?fresh.find(e=>e.type===wanted&&e.targetId===t.targetId&&(!t.workerId||e.workerId===t.workerId)):null;
   const crate=t.kind==='crate'?s.crates.find(c=>c.id===t.targetId&&c.carrierId&&(!t.workerId||c.carrierId===t.workerId)):null;
   r.removal={interval:[previous.elapsed,current.elapsed],evidence:event?{eventId:event.id,type:event.type,workerId:event.workerId}:crate?{type:'carrier-pickup-observed',carrierId:crate.carrierId}:null,
    outcome:event||crate?'evidenced-completion-or-pickup':'unknown-censored-removal'};
  }
  if(row.firstObservedDelivery===null&&fresh.some(e=>e.type==='CrateDelivered'))row.firstObservedDelivery={time:s.time,interval:[previous?.elapsed??null,current.elapsed]};
  const kinds={};for(const t of current.tasks)add(kinds,t.kind+':'+(t.workerId?'reserved':'unreserved'),1);
  for(const [key,value] of Object.entries(kinds))row.peaks[key]=Math.max(row.peaks[key]??0,value);
  frames.push({day:s.day,time:s.time,elapsed:s.elapsed,raid:current.raid,living:current.live,firstWaterPending:current.firstWaterPending,
   queue:kinds,blockedTasks:current.tasks.filter(t=>t.blocked).length,workers:current.workers.length,
   contractedToday:current.workers.filter(w=>w.contractDay===s.day).length,workerSamples:current.workers,
   phaseCounts:current.workers.reduce((n,w)=>(add(n,phase(w),1),n),{}),
   possibleEventBufferSaturation:fresh.length===200,
   longestTasks:current.tasks.map(t=>({id:t.id,kind:t.kind,targetId:t.targetId,workerId:t.workerId,blocked:t.blocked,firstObservedAge:current.elapsed-records.get(t.id).firstObservedAt})).sort((a,b)=>b.firstObservedAge-a.firstObservedAge).slice(0,3)});
  previous=current;
 }
 return {observe,decision:row=>decisions.push({...row}),result:()=>({days:[...days.values()],tasks:[...records.values()],frames,gaps,decisions,
  unknowns:['Private actor-motion pendingDetours/blockedDetours WeakMaps cannot be inspected through frozen hooks; stationary walking is not labelled route search/collision/yield without evidence.','Events/tasks have no native creation timestamps; appearance/reservation/removal are first-observed intervals at callback cadence, with null lower bound when already present at first callback.','Straight-line displacement is a lower bound on actual path length traversed within a tick.','Tasks created and completed entirely between callbacks can be missed; disappearance without event/carrier evidence is censored, never assumed completion.'],
  scope:'Observer-owned scalar copies only; no commands/nav queries/RNG. Sampled actor-seconds are not global elapsed time or exact substep time. Reservation waits start at first observation, not invented enqueue timestamps. No performance or campaign acceptance.'})};
}
