// Diagnostic projection protocol. It is not a complete game snapshot.
const kinds=['workers','animals','structures'];
const clone=x=>structuredClone(x);
function validProjection(p){return p&&Number.isFinite(p.elapsed)&&kinds.every(k=>Array.isArray(p[k])&&new Set(p[k].map(x=>x.id)).size===p[k].length&&p[k].every(x=>typeof x.id==='string'));}
export function createProjectionPublisher(session){
 let state=null,version=0,nextEvent=1,acknowledged=0,delivered=0,events=[];
 const packetEvents=()=>{if(events.length)delivered=events.at(-1).sequence;return clone(events);};
 return {
  publish(projection){if(!validProjection(projection)||!Array.isArray(projection.events))throw Error('Invalid projection');const incoming=clone(projection),added=incoming.events;delete incoming.events;
   const base=version,updates={};for(const k of kinds){const old=new Map((state?.[k]??[]).map(x=>[x.id,x]));updates[k]={order:incoming[k].map(x=>x.id),changed:incoming[k].filter(x=>JSON.stringify(x)!==JSON.stringify(old.get(x.id)))};}
   state=incoming;version++;for(const event of added)events.push({sequence:nextEvent++,event});return {kind:'delta',session,base,version,elapsed:state.elapsed,updates,events:packetEvents()};},
  snapshot(){if(!state)throw Error('Not initialized');return {kind:'snapshot',session,version,state:clone(state),events:packetEvents()};},
  acknowledge(s,n){if(s!==session||!Number.isSafeInteger(n)||n<acknowledged||n>delivered)return false;acknowledged=n;events=events.filter(e=>e.sequence>n);return true;},
  status(){return {version,acknowledged,delivered,pending:events.length};}
 };
}
export function createProjectionReceiver(session){
 let state=null,version=0,lastEvent=0,events=[];
 return {
  accept(packet){if(!packet||packet.session!==session||!Number.isSafeInteger(packet.version)||packet.version<1||!Array.isArray(packet.events))return {accepted:false,reason:'invalid'};
   if(packet.kind==='delta'&&(packet.base!==version||packet.version!==version+1))return {accepted:false,reason:'gap'};
   if(packet.kind==='snapshot'&&packet.version<version)return {accepted:false,reason:'stale'};
   let nextEvent=lastEvent;const fresh=[];for(const e of packet.events){if(!Number.isSafeInteger(e.sequence)||e.sequence<1)return {accepted:false,reason:'event'};if(e.sequence<=nextEvent)continue;if(e.sequence!==nextEvent+1)return {accepted:false,reason:'event-gap'};nextEvent=e.sequence;fresh.push(e);}
   let next;if(packet.kind==='snapshot'){if(!validProjection(packet.state))return {accepted:false,reason:'invalid'};next=clone(packet.state);}
   else if(packet.kind==='delta'){
    if(!Number.isFinite(packet.elapsed)||!packet.updates)return {accepted:false,reason:'invalid'};next={elapsed:packet.elapsed};
    for(const k of kinds){const part=packet.updates[k];if(!part||!Array.isArray(part.order)||!Array.isArray(part.changed)||new Set(part.order).size!==part.order.length)return {accepted:false,reason:'invalid'};const byId=new Map((state?.[k]??[]).map(x=>[x.id,x]));for(const x of part.changed){if(!x||typeof x.id!=='string')return {accepted:false,reason:'invalid'};byId.set(x.id,x);}if(part.order.some(id=>!byId.has(id)))return {accepted:false,reason:'invalid'};next[k]=part.order.map(id=>byId.get(id));}
    if(!validProjection(next))return {accepted:false,reason:'invalid'};next=clone(next);
   }else return {accepted:false,reason:'invalid'};
   state=next;version=packet.version;lastEvent=nextEvent;events.push(...clone(fresh));return {accepted:true,version,lastEvent,newEvents:fresh.length};
  },
  state(){return clone({state,version,lastEvent,events});}
 };
}
