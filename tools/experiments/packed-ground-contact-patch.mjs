export function patchPackedContacts(source,name){
 const replace=(old,next)=>{if(source.split(old).length!==2)throw Error('Packed contacts anchor changed: '+name);source=source.replace(old,next);};
 const helpers="import {packGroundContacts,hasPackedContact,packedContactTriangles,packedContactTransferables} from '/tools/experiments/packed-ground-contact-candidate.js';\n";
 if(name==='far-scene-worker.js'){
  replace('self.postMessage({data,buildMs:performance.now()-start},farSceneTransferables(data));','data.ground=packGroundContacts(data.ground);self.postMessage({data,buildMs:performance.now()-start},[...farSceneTransferables(data),...packedContactTransferables(data.ground)]);');
 }else if(name==='far-ground-contacts.js'){
  replace('const patch=data.contactCells?.[x+\':\'+z];if(patch)return patch;',"if(hasPackedContact(data,x,z))return packedContactTriangles(data,x,z);const patch=data.contactCells?.[x+':'+z];if(patch)return patch;");
 }else if(name==='far-ground-data.js'){
  replace("if(data.contactCells?.[ix+':'+iz])", "if(hasPackedContact(data,ix,iz)||data.contactCells?.[ix+':'+iz])");
 }else if(name==='native-far-ground-seam.js'){
  replace('contactCells:ground.contactCells','contactCells:ground.contactCells,packedContacts:ground.packedContacts');
 }else throw Error('Unsupported packed contacts source '+name);
 return helpers+source;
}
