import {WALL_UNIT,gateScale,wallStroke} from '../wall-layout.js';
import {boundaryFaces} from '../boundary-faces.js';
import {containsPoint} from '../footprints.js';
import {ANIMAL_SPATIAL_PROFILES} from './spatial-movement-profiles.js';

export const SMALLEST_ANIMAL_RADIUS=Math.min(...Object.values(
  ANIMAL_SPATIAL_PROFILES).map(profile=>profile.radius));

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
    const gates=face.ids.filter(id=>walls.some(p=>p.id===id&&p.gate&&p.autoGate));
    return gates.length?{status:'closed-wall-loop',gates}:
      {status:'closed-without-gate'};
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
