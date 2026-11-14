// A tombstone shares the chunk revision channel with canonical payloads. It
// carries no replacement geometry, instances or GPU-readiness assertion.
export function validateTerrainResourceRemoval(payload){
 if(payload?.authority!=='spatial-wasm'||payload.removed!==true||
    !Number.isSafeInteger(payload.cx)||!Number.isSafeInteger(payload.cz)||
    payload.capturedAt!==undefined&&(!Number.isFinite(payload.capturedAt)||payload.capturedAt<0)||
    Object.keys(payload).some(key=>!['authority','removed','cx','cz','capturedAt'].includes(key)))
  throw TypeError('Invalid authoritative terrain removal');
}
