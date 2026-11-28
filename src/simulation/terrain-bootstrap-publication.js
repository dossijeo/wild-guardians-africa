// A prepared authority cannot announce terrain attachment until every resident
// chunk was staged and committed. Partial initial terrain is never accepted.
export function bootstrapTerrainPublication(authority,publication){
 if(typeof authority?.publishResidentTerrainForQa!=='function'||typeof publication?.stage!=='function'||typeof publication?.commit!=='function'||typeof publication?.fail!=='function')throw TypeError('Invalid terrain bootstrap');
 try{authority.publishResidentTerrainForQa((chunk,capturedAt)=>{if(publication.stage(chunk,capturedAt)!==true)throw Error('Terrain bootstrap staging failed');});if(publication.commit(0)!==true)throw Error('Terrain bootstrap commit failed');}
 catch(error){publication.fail(error);throw error;}
}
