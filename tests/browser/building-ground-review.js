import {Vector3} from 'three';
import {renderedTerrainSurface} from '../../src/rendering/terrain-surface.js';

export function inspectBuildingGround(world,state,nav){
 const center=state.structures.find(s=>s.kind==='center'),root=center&&world.objects.get(center.id);
 if(!root?.outer)throw Error('Native center not ready');
 root.updateWorldMatrix(true,true);
 const position=root.outer.geometry.attributes.aPos,normal=root.outer.geometry.attributes.aNormal,p=new Vector3();
 const rows=[];
 for(let i=0;i<position.count;i++){
  // Inspect low, approximately horizontal authored surfaces only.
  if(position.getY(i)*root.scale.y>.35||Math.abs(normal.getY(i))<.7)continue;
  p.fromBufferAttribute(position,i).applyMatrix4(root.outer.matrixWorld);
  const ground=renderedTerrainSurface(nav.field,p.x,p.z);
  rows.push({position:p.toArray(),ground,gap:p.y-ground,normalY:normal.getY(i)});
 }
 rows.sort((a,b)=>a.gap-b.gap);
 return {kind:'building-ground',id:center.id,culture:center.culture??state.culture,position:root.position.toArray(),scale:root.scale.toArray(),damage:root.damage,samples:rows.length,minimum:rows[0],maximum:rows.at(-1),nearSurface:rows.filter(r=>Math.abs(r.gap)<.03).length,penetrating:rows.filter(r=>r.gap<-.005).length,worst:rows.slice(0,12)};
}
