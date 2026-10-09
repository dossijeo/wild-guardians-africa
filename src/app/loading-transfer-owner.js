import {LoadingDownloads} from './loading-downloads.js';
import {subscribeAssetTransfers} from '../rendering/asset-transfer.js';
import {assetExpectedBytes} from '../rendering/asset-url.js';

// Installed before menu-transition preparation starts; removal prevents late
// native loader callbacks from updating a cancelled or subsequent load.
export class LoadingTransferOwner {
 constructor(options={}){this.downloads=new LoadingDownloads({expectedBytes:assetExpectedBytes,...options});this.ids=new Map();this.timings=new Map();this.started=performance.now();this.release=subscribeAssetTransfers(event=>this.accept(event));
  // HUD images/styles and native Worker module scripts have no byte callback.
  // Observe their completed original requests; this does not fetch them again.
  if(typeof PerformanceObserver!=='undefined'){try{this.observer=new PerformanceObserver(list=>{for(const entry of list.getEntries())this.resource(entry);});this.observer.observe({type:'resource',buffered:true});}catch{this.observer?.disconnect();this.observer=null;}}
 }
 accept(event){
  if(this.disposed)return;
  if(event.type==='start'){this.ids.set(event.id,this.downloads.begin(event.url,{kind:event.kind,start:event.start}));return;}
  const id=this.ids.get(event.id);if(id===undefined)return;
  if(event.type==='progress')this.downloads.update(id,event.loaded,event.total,{evidence:event.evidence});
  else if(event.type==='cache'){this.downloads.markCached(id);this.ids.delete(event.id);this.timings.delete(id);}
  else if(event.type==='end'){this.downloads.finish(id,{...event,timing:event.timing??this.timings.get(id)});this.ids.delete(event.id);this.timings.delete(id);}
 }
 resource(entry){
  if(this.disposed||entry.startTime<this.started||!/^https?:/.test(entry.name))return;
  const existing=[...this.downloads.requests.values()].find(request=>request.url===entry.name&&entry.startTime>=request.start-5&&entry.startTime<=(request.end??performance.now()));
  // An observer can receive completion before GLTF parse/onLoad resolves. Its
  // entry may no longer fit the browser's finite getEntriesByName buffer later.
  if(existing){if(existing.end!==null)this.downloads.applyTiming(existing.id,entry);else {this.timings.set(existing.id,entry);this.downloads.applyTiming(existing.id,entry);}return;}
  const path=new URL(entry.name).pathname,dom=['img','link','css'].includes(entry.initiatorType),script=['script','other'].includes(entry.initiatorType)&&/\.(?:m?js)$/.test(path);
  if(!(dom||script)||!/(?:\/assets\/|\/content\/|\/src\/persistence\/)/.test(path))return;
  const id=this.downloads.begin(entry.name,{kind:script?'native-script':'dom-resource',start:entry.startTime});this.downloads.finish(id,{timing:entry});
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.observer?.disconnect();this.release();this.ids.clear();this.timings.clear();this.downloads.dispose();}
}
