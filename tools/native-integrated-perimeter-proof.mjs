// Experimental QA integration, never a gameplay enclosure shortcut.
import {nativePerimeterReusedCandidateV2} from './native-perimeter-reused-candidate-v2.mjs';
import {installTerrainLatticeTiles} from './terrain-lattice-tile-candidate.mjs';
export function nativeIntegratedPerimeterProof(state,nav,plan,bounds,options={}){
 const field=nav.field,tiles=installTerrainLatticeTiles(field);
 try{
  const proof=nativePerimeterReusedCandidateV2(state,nav,plan,bounds,options);
  return {...proof,terrainTileDiagnostics:tiles.stats(),integrationVersion:'contact-service-reuse-v2'};
 }finally{tiles.restore();}
}
