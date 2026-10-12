import {Navigation} from '../src/world/navigation.js';
import {wallCollisionBounds} from '../src/world/wall-collision-frame.js';
const coarse=Navigation.prototype.coarseSegmentClear,walk=Navigation.prototype.testWalkable;
// QA-only synchronous immutable lease. Bounds are conservative and native
// collision functions still decide every retained candidate. Doors are never
// filtered here; unsupported radii use the existing native broadphase.
export function withNativeWallBroadphase(view,compute,{enabled=false,maxRadius=4,onDiagnostics=()=>{}}={}){
 if(typeof enabled!=='boolean'||!Number.isFinite(maxRadius)||maxRadius<0||maxRadius>16)throw Error('Invalid QA wall broadphase options');
 const stats={enabled,eligibleWalls:0,boundQueries:0,conservativeHits:0,unsupportedQueries:0};
 if(!enabled){const result=compute(view);onDiagnostics(stats);return result;}
 if(view.coarseSegmentClear!==coarse||view.testWalkable!==walk)throw Error('QA broadphase requires native collision functions');
 const obstacles=view.obstacles,version=view.version,bounds=view.obstacleBounds,identity=JSON.stringify(obstacles),map=new WeakMap();
 for(const wall of obstacles)if(wall.kind==='wall'&&!wall.gate){map.set(wall,wallCollisionBounds(wall,maxRadius));stats.eligibleWalls++;}
 const shadow=Object.create(view);let active=true,radius=null;
 const adapter={get:o=>{
  stats.boundQueries++;if(radius===null||!Number.isFinite(radius)||radius<0||radius>maxRadius){stats.unsupportedQueries++;return bounds?.get(o);}
  const hit=map.get(o);if(hit){stats.conservativeHits++;return hit;}return bounds?.get(o);
 }};Object.defineProperty(shadow,'obstacleBounds',{get:()=>active?adapter:view.obstacleBounds});
 const invoke=(fn,args,receiver)=>{const previous=radius;radius=args[2]??.3;try{return fn.apply(receiver,args);}finally{radius=previous;}};
 shadow.coarseSegmentClear=function(...args){return active?invoke(coarse,args,this):view.coarseSegmentClear(...args);};
 shadow.testWalkable=function(...args){return active?invoke(walk,args,this):view.testWalkable(...args);};
 try{const result=compute(shadow);if(result?.then)throw Error('QA broadphase lease must remain synchronous');if(view.version!==version||view.obstacles!==obstacles||view.obstacleBounds!==bounds||JSON.stringify(obstacles)!==identity||view.coarseSegmentClear!==coarse||view.testWalkable!==walk)throw Error('QA broadphase geometry changed; reject certificate');return result;}
 finally{active=false;onDiagnostics({...stats});}
}
