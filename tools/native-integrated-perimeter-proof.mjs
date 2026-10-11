// Experimental QA integration, never a gameplay enclosure shortcut.
import {nativePerimeterReusedCandidateV2} from './native-perimeter-reused-candidate-v2.mjs';
import {installTerrainLatticeTiles} from './terrain-lattice-tile-candidate.mjs';
import {installTerrainValidityMemo} from './terrain-validity-memo-candidate.mjs';
export function nativeIntegratedPerimeterProof(state,nav,plan,bounds,options={}){
 const field=nav.field,tiles=installTerrainLatticeTiles(field);let terrainMemo;
 try{
  if(options.terrainMemo)terrainMemo=installTerrainValidityMemo(nav);
  const proof=nativePerimeterReusedCandidateV2(state,nav,plan,bounds,options);
  return {...proof,terrainTileDiagnostics:tiles.stats(),...(terrainMemo?{terrainMemoDiagnostics:terrainMemo.stats()}:{}),integrationVersion:'contact-service-reuse-v2'};
 }finally{try{terrainMemo?.restore();}finally{tiles.restore();}}
}
