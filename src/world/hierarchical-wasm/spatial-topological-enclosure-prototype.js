import {WALL_UNIT,gateScale,wallStroke} from '../wall-layout.js';
import {boundaryFaces} from '../boundary-faces.js';
import {containsPoint} from '../footprints.js';
import {wallCollisionFrame} from '../wall-collision-frame.js';
import {ANIMAL_SPATIAL_PROFILES} from './spatial-movement-profiles.js';

export const SMALLEST_ANIMAL_RADIUS=Math.min(...Object.values(
  ANIMAL_SPATIAL_PROFILES).map(profile=>profile.radius));

// Zero-width diagnostic for wall coverage of a boundary face. A point ray
// can pass a sub-body seam even when an animal's committed crop hit cannot.
// Canyon fluid occludes crop-hit rays separately; ordinary props do not.
export function wallOccludesBoundaryFace(a,b,walls){
  if(![a?.x,a?.z,b?.x,b?.z].every(Number.isFinite)||!Array.isArray(walls))
    throw TypeError('Expected a finite face and wall list');
  const intervals=[];
  for(const wall of walls){
    if(wall?.kind!=='wall'||wall.status==='ruined')continue;
    const frame=wallCollisionFrame(wall),c=frame.c,s=frame.s;
    const ax=a.x-frame.x,az=a.z-frame.z,bx=b.x-frame.x,bz=b.z-frame.z;
    const axes=[[ax*c-az*s,bx*c-bz*s,frame.width],
      [ax*s+az*c,bx*s+bz*c,frame.depth]];
    let low=0,high=1;
    for(const [first,last,half] of axes){
      const delta=last-first;
      if(Math.abs(delta)<1e-12){
        if(Math.abs(first)>half){low=1;high=0;break;}
      }else{
        const t0=(-half-first)/delta,t1=(half-first)/delta;
        low=Math.max(low,Math.min(t0,t1));
        high=Math.min(high,Math.max(t0,t1));
        if(low>high)break;
      }
    }
    if(low<=high)intervals.push([low,high]);
  }
  intervals.sort((a,b)=>a[0]-b[0]||b[1]-a[1]);
  let covered=0;
  for(const [low,high] of intervals){
    if(low>covered+1e-10)return false;
    covered=Math.max(covered,high);
    if(covered>=1-1e-10)return true;
  }
  return false;
}

// Fast geometry-only candidate. Taking the hull of square crop clearances
// avoids a fragile offset/miter calculation and encloses every crop with the
// requested margin. Physical placement, doors and price remain separate.
export function cropClearanceHull(points,margin){
  if(!Array.isArray(points)||!points.length||!Number.isFinite(margin)||margin<=0||
    points.some(p=>!Number.isFinite(p?.x)||!Number.isFinite(p?.z)))
    throw TypeError('Expected crop positions and a positive clearance');
  const corners=points.flatMap(({x,z})=>[[-margin,-margin],[-margin,margin],
    [margin,-margin],[margin,margin]].map(([dx,dz])=>[x+dx,z+dz]));
  corners.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-
    (b[1]-a[1])*(c[0]-a[0]);
  const chain=list=>{
    const out=[];
    for(const point of list){
      while(out.length>1&&cross(out.at(-2),out.at(-1),point)<=0)out.pop();
      out.push(point);
    }
    return out.slice(0,-1);
  };
  const hull=[...chain(corners),...chain([...corners].reverse())];
  return [...hull,hull[0]];
}

// A self-closing stroke needs no natural-barrier contact check. Open arcs only
// require examination where their physical modules meet a pre-existing solid.
// This classifies the work; it does not mistake a grid edge for a solid join.
export function enclosureJunctions(strokes){
  const junctions=[];
  for(const [strokeIndex,points] of strokes.entries()){
    if(points.length<2)continue;
    const first=points[0],last=points.at(-1);
    if(Math.hypot(first[0]-last[0],first[1]-last[1])<1e-6)continue;
    junctions.push({strokeIndex,end:'start',point:first});
    junctions.push({strokeIndex,end:'finish',point:last});
  }
  return junctions;
}

// Recognize a two-transect candidate discovered by the native cut. This is a
// topology label, not a protection certificate: the final quote, every
// boundary face, attack reach and worker access are checked separately.
// `naturalFaces` contains the native cut-face classification before preview.
export function identifyNaturalCorridor(strokes,naturalFaces){
  if(strokes.length!==2||!Array.isArray(naturalFaces))return null;
  const distanceToFace=(point,[ox,oz,ix,iz])=>{
    const mx=(ox+ix)/2,mz=(oz+iz)/2;
    const a=ox!==ix?[mx,mz-.5]:[mx-.5,mz];
    const b=ox!==ix?[mx,mz+.5]:[mx+.5,mz];
    const dx=b[0]-a[0],dz=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+
      (point[1]-a[1])*dz)/(dx*dx+dz*dz)));
    return Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dz);
  };
  const ends=[];
  for(const stroke of strokes){
    if(stroke.length<2||Math.hypot(stroke[0][0]-stroke.at(-1)[0],
      stroke[0][1]-stroke.at(-1)[1])<1e-6)return null;
    const attached=[stroke[0],stroke.at(-1)].map(point=>{
      const near=naturalFaces.filter(face=>face.kind>0&&
        distanceToFace(point,face.edge)<.76)
        .sort((a,b)=>distanceToFace(point,a.edge)-
          distanceToFace(point,b.edge)||a.kind-b.kind)[0];
      return near?.kind===2||near?.kind===3?'fluid':
        near?.kind===1||near?.kind===4?'solid':null;
    });
    if(!attached[0]||!attached[1]||attached[0]===attached[1])return null;
    ends.push(attached);
  }
  if([...ends[0]].sort().join(',')!==[...ends[1]].sort().join(','))return null;
  const mid=stroke=>[(stroke[0][0]+stroke.at(-1)[0])/2,
    (stroke[0][1]+stroke.at(-1)[1])/2];
  const a=mid(strokes[0]),b=mid(strokes[1]);
  const axis=[b[0]-a[0],b[1]-a[1]],length=Math.hypot(...axis);
  if(length<2)return null;
  for(const stroke of strokes){
    const delta=[stroke.at(-1)[0]-stroke[0][0],
      stroke.at(-1)[1]-stroke[0][1]],width=Math.hypot(...delta);
    if(width<1||Math.abs(delta[0]*axis[0]+delta[1]*axis[1])>
      width*length*.55)return null;
  }
  return {kind:'natural-corridor',barriers:[...ends[0]].sort(),
    transects:2,axis:[axis[0]/length,axis[1]/length]};
}

// A cut describes ideal line ends. Clearance must instead be measured from
// the outer end of each module that survives the game's placement quote.
// Missing end modules make the physical join unprovable, even if a grid edge
// or the ideal stroke endpoint happened to touch a natural obstacle.
export function placedEnclosureJunctions(quote){
  if(!Array.isArray(quote?.strokeSlots)||!Array.isArray(quote?.previewPieces))
    return {status:'unknown',reason:'missing-placement-geometry',junctions:[]};
  if(quote.blockedPieces?.length||quote.blockedCrops?.length)
    return {status:'unknown',reason:'omitted-module',junctions:[]};
  if(quote.strokeClosed?.some(Boolean))
    return {status:'unknown',reason:'use-wall-face-check',junctions:[]};
  const pieces=quote.previewPieces.filter(piece=>piece.kind==='wall'&&
    piece.hp>0&&piece.status!=='ruined'&&piece.status!=='collapsing');
  const match=slot=>pieces.find(piece=>
    Math.hypot(piece.x-slot.x,piece.z-slot.z)<1e-5&&
    Math.abs(Math.sin((piece.yaw??0)+slot.angle))<1e-5&&
    Math.abs((piece.baseScaleX??1)-slot.scaleX)<1e-5);
  const junctions=[];
  for(const [strokeIndex,slots] of quote.strokeSlots.entries()){
    if(!slots.length)return {status:'unknown',reason:'empty-stroke',junctions};
    const first=slots[0],last=slots.at(-1);
    const a=match(first),b=match(last);
    if(!a||!b)return {status:'unknown',reason:'missing-end-module',junctions};
    for(const [end,piece,sign] of [['start',a,-1],['finish',b,1]]){
      const half=(piece.baseScaleX??1)*(piece.gate?gateScale(piece.material):1)*
        WALL_UNIT*.5;
      junctions.push({strokeIndex,end,pieceId:piece.id,
        point:[piece.x+sign*Math.cos(piece.yaw??0)*half,
          piece.z-sign*Math.sin(piece.yaw??0)*half]});
    }
  }
  return {status:'ready',junctions};
}

// For a measured clear span between the *physical* wall and obstacle surfaces,
// a circle of the smallest species cannot pass if the span is below its
// diameter. Unknown geometry must remain unknown; equality is ambiguous.
export function junctionBlocksSmallestAnimal(clearSpan){
  if(!Number.isFinite(clearSpan)||clearSpan<0)return null;
  return clearSpan<SMALLEST_ANIMAL_RADIUS*2;
}

// A closed cut boundary is a geometric separator. Prove that every point of
// its line segments is inside an animal-solid footprint using the 1-Lipschitz
// bound of distance-to-solids: between two samples d0/d1, the distance can
// never exceed (d0+d1+segmentLength)/2. This deliberately ignores terrain;
// a water/cliff-supported boundary remains unknown until it has its own proof.
export function inspectStaticCutBoundary(values,clearance,{radius=
  SMALLEST_ANIMAL_RADIUS,maxQueries=10000,maxDepth=12}={}){
  if(!Array.isArray(values)||values.length%4||typeof clearance!=='function'||
    !(radius>1e-4)||!Number.isInteger(maxQueries)||maxQueries<1||
    !Number.isInteger(maxDepth)||maxDepth<0)
    throw TypeError('Expected cut boundary quartets and a native clearance query');
  if(!values.length)return {status:'unknown',reason:'empty-boundary',
    segments:0,queries:0};
  const safeRadius=radius-1e-4,samples=new Map();
  const distance=point=>{
    const key=point.join(',');
    if(samples.has(key))return samples.get(key);
    if(samples.size>=maxQueries)return NaN;
    const value=clearance(point[0],point[1]);
    samples.set(key,value);
    return value;
  };
  const covered=(a,b,depth)=>{
    const first=distance(a),last=distance(b);
    if(!Number.isFinite(first)||!Number.isFinite(last)||
      first<0||last<0||first>=safeRadius||last>=safeRadius)return false;
    const length=Math.hypot(a[0]-b[0],a[1]-b[1]);
    if((first+last+length)*.5<safeRadius)return true;
    if(depth>=maxDepth)return false;
    const middle=[(a[0]+b[0])*.5,(a[1]+b[1])*.5];
    return covered(a,middle,depth+1)&&covered(middle,b,depth+1);
  };
  for(let i=0;i<values.length;i+=4){
    const [ox,oz,ix,iz]=values.slice(i,i+4);
    if(![ox,oz,ix,iz].every(Number.isInteger)||
      Math.abs(ox-ix)+Math.abs(oz-iz)!==1)
      throw TypeError('Expected adjacent integer cut cells');
    const ends=ox!==ix?[[ox/2+ix/2,iz-.5],[ox/2+ix/2,iz+.5]]:
      [[ix-.5,oz/2+iz/2],[ix+.5,oz/2+iz/2]];
    if(!covered(...ends,0))return {status:'unknown',segment:i/4,
      edge:[ox,oz,ix,iz],endpoints:ends,
      endpointClearances:ends.map(distance),queries:samples.size};
  }
  return {status:'blocked-by-static-solids',segments:values.length/4,
    queries:samples.size};
}

// One native surface-to-surface measurement per exposed wall end, never one
// per crop or animal. The obstacle between the ends must independently be
// known to stay impassable; a small endpoint gap cannot certify an unknown
// river, cliff or unloaded sector.
function inspectJunctions(junctions,measureClearSpan,barrierContinuous){
  if(typeof measureClearSpan!=='function')throw TypeError('Expected a native clearance query');
  if(!junctions.length)return {status:'unknown',reason:'no-natural-junctions',
    junctions:0,spans:[]};
  const spans=[];
  for(const junction of junctions){
    const span=measureClearSpan(junction);
    spans.push(span);
    if(junctionBlocksSmallestAnimal(span)===false)
      return {status:'open',junctions:spans.length,spans};
  }
  if(barrierContinuous===false)return {status:'open',reason:'natural-barrier-gap',
    junctions:spans.length,spans};
  if(barrierContinuous!==true||spans.some(span=>
    junctionBlocksSmallestAnimal(span)!==true))
    return {status:'unknown',junctions:spans.length,spans};
  return {status:'joined',junctions:spans.length,spans};
}

export function inspectNaturalJunctions(strokes,measureClearSpan,barrierContinuous){
  return inspectJunctions(enclosureJunctions(strokes),measureClearSpan,
    barrierContinuous);
}

export function inspectPlacedNaturalJunctions(quote,measureClearSpan,
  barrierContinuous){
  // The clearance callback reads the confirmed world. A quote that removes
  // any static object could remove the very obstacle supporting an open arc.
  if(quote?.suppressed?.length)return {status:'unknown',
    reason:'suppressed-static-obstacle',junctions:0,spans:[]};
  const placed=placedEnclosureJunctions(quote);
  if(placed.status!=='ready')return {status:'unknown',reason:placed.reason,
    junctions:placed.junctions.length,spans:[]};
  return inspectJunctions(placed.junctions,measureClearSpan,barrierContinuous);
}

// Cheap structural proof for the simple case: the *placed* wall pieces form
// one closed face around every requested crop and that face has an automatic
// worker gate. The ordinary quote is responsible for gate placement and worker
// access; this does not certify an arbitrary pre-existing manual opening.
// Natural-barrier joins are deliberately excluded until native clearance is
// measured at their exposed terminals.
export function inspectSelfClosedQuote(quote,existingWalls,cropPoints){
  if(!quote?.pieces?.length||!Array.isArray(existingWalls)||
    !Array.isArray(cropPoints)||!cropPoints.length)return {status:'unknown'};
  if(quote.blockedPieces?.length||quote.blockedCrops?.length)
    return {status:'open',reason:'omitted-module'};
  const proposed=new Map((quote.previewPieces??quote.pieces).map(p=>[p.id,p]));
  const walls=[...existingWalls.filter(p=>p.kind==='wall'&&
    !proposed.has(p.id)),...proposed.values()].filter(p=>p.kind==='wall'&&
      p.hp>0&&p.status!=='ruined'&&p.status!=='collapsing');
  if(walls.length>512)return {status:'unknown',reason:'too-many-walls'};
  const layout=walls.map(p=>({id:p.id,kind:p.gate?'gate':'wall',
    hp:p.hp,collapse:false,x:p.x,z:p.z,angle:-(p.yaw??0),
    scaleX:(p.baseScaleX??1)*(p.gate?
      ({adobe:1.4,piedra:1.4,reforzado:1.6}[p.material]??1):1)}));
  for(const face of boundaryFaces(layout)){
    const polygon=face.polygon.map(([x,z])=>({x,z}));
    if(!cropPoints.every(point=>containsPoint(polygon,point.x,point.z)))continue;
    // boundaryFaces snaps centerline endpoints within 0.10 m of a shared
    // node. Even two snapped ends differ by less than 0.20 m, below the
    // smallest animal diameter. Committed crop hits use that body radius
    // in agriculturalRayClear, so a point-ray seam cannot damage a crop.
    // Natural joins are checked separately.
    const gates=face.ids.filter(id=>walls.some(p=>p.id===id&&p.gate&&p.autoGate));
    return gates.length?{status:'closed-wall-loop',gates,attackOccluded:true}:
      {status:'closed-without-gate',attackOccluded:true};
  }
  return {status:'open',reason:'no-wall-face'};
}

// Experimental conversion of native cut edges to world-space wall strokes.
// It deliberately does not issue a purchase or certify a physically closed
// enclosure. The game's quote/preview/build rules remain the final authority.
export function cutEdgesToStrokes(values){
  if(values.length%4)throw TypeError('Expected native cut edge quartets');
  const segments=[],adjacency=new Map();
  const key=point=>point.join(',');
  const add=(point,id)=>{
    const name=key(point),list=adjacency.get(name)??[];
    list.push(id);adjacency.set(name,list);
  };
  for(let i=0;i<values.length;i+=4){
    const [ox,oz,ix,iz]=values.slice(i,i+4);
    if(Math.abs(ox-ix)+Math.abs(oz-iz)!==1)
      throw TypeError('Native cut contains a nonlocal connection');
    const ends=ox!==ix?[[ox/2+ix/2,iz-.5],[ox/2+ix/2,iz+.5]]:
      [[ix-.5,oz/2+iz/2],[ix+.5,oz/2+iz/2]];
    const id=segments.length;segments.push(ends);
    for(const end of ends)add(end,id);
  }
  const ambiguous=[...adjacency].filter(([,ids])=>ids.length>2).map(([point])=>point);
  const seen=new Set(),strokes=[];
  const walk=start=>{
    const points=[start],name=()=>key(points.at(-1));
    while(true){
      const next=(adjacency.get(name())??[]).find(id=>!seen.has(id));
      if(next===undefined)break;
      seen.add(next);
      const ends=segments[next];points.push(key(ends[0])===name()?ends[1]:ends[0]);
      if(points.length>segments.length+1)throw Error('Cut contour did not terminate');
    }
    if(points.length>1)strokes.push(points);
  };
  for(const [point,ids] of [...adjacency].sort((a,b)=>a[0].localeCompare(b[0])))
    if(ids.length===1&&ids.some(id=>!seen.has(id)))walk(point.split(',').map(Number));
  for(let id=0;id<segments.length;id++)if(!seen.has(id))walk(segments[id][0]);
  return {strokes,ambiguous};
}

export function approximateCutModules(cutValues,structures,material,costPerModule){
  const {strokes,ambiguous}=cutEdgesToStrokes(cutValues);
  const slots=strokes.flatMap(points=>wallStroke(points,structures,
    {smooth:false,snap:false}));
  return {strokes,ambiguous,junctions:enclosureJunctions(strokes),slots,material,
    estimatedCost:slots.length*costPerModule,
    status:ambiguous.length?'ambiguous':'requires-physical-validation'};
}

// Diagnostic bridge for two open frontier arcs separated by a natural solid.
// The ordinary quote must reject any modules that cannot be placed and its
// final native preview must prove that the remaining arcs really close.
export function stitchTwoCutStrokes(strokes,maxConnector=8){
  if(strokes.length===1)return strokes[0];
  if(strokes.length!==2||strokes.some(points=>points.length<2||
    Math.hypot(points[0][0]-points.at(-1)[0],
      points[0][1]-points.at(-1)[1])<1e-6))return null;
  const [a,b]=strokes,score=other=>{
    const distance=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
    return [distance(a.at(-1),other[0]),distance(other.at(-1),a[0])];
  };
  const forward=score(b),reverse=score([...b].reverse());
  const chosen=forward[0]+forward[1]<=reverse[0]+reverse[1]?b:[...b].reverse();
  const links=score(chosen);
  if(links.some(length=>length>maxConnector))return null;
  return [...a,...chosen,a[0]];
}
