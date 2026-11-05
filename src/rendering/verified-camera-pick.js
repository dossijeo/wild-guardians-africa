// QA: compare both cameras on the same already-confirmed scene. This does not
// certify which OffscreenCanvas frame was presented by the compositor.
export function assertPickFrame(surface,frame){const sequence=surface?.stream?.status().sequence??null,terrainGeneration=surface?.terrain?.revisionGeneration?.()??null,selectableGeneration=surface?.selectableGeneration??null,pending=surface?.terrain?.status().pending??null;if(!frame||sequence!==frame.sequence||terrainGeneration!==frame.terrainGeneration||selectableGeneration!==frame.selectableGeneration||pending){const error=Error('Stale WebGPU pick');error.details={expected:frame??null,actual:{sequence,terrainGeneration,selectableGeneration,pending},condition:!frame?'missing-frame':sequence!==frame.sequence?'sequence':terrainGeneration!==frame.terrainGeneration?'terrain-generation':selectableGeneration!==frame.selectableGeneration?'selectable-generation':'terrain-pending'};throw error;}}
export function verifyCameraPick({surface,coordinate,cameraOld,cameraNew,restoreCamera=cameraNew,expected}){
 if(!surface?.pick||!surface.stream||!cameraOld||!cameraNew||!expected?.entityId)throw Error('Camera verification unavailable');
 const sequence=surface.stream.status().sequence;if(sequence!==expected.sequence)return {...expected,cameraVerified:false};let old,current,guardianContext;
 try{surface.setCamera(cameraOld);old=surface.pick(coordinate);guardianContext=surface.guardianContext?.()??null;surface.setCamera(cameraNew);current=surface.pick(coordinate);}finally{surface.setCamera(restoreCamera);}
 const verified=surface.stream.status().sequence===sequence&&old.sequence===sequence&&current.sequence===sequence&&!old.incomplete&&!current.incomplete&&old.entityId===expected.entityId&&current.entityId===old.entityId;
 return {...old,cameraVerified:verified,...(verified&&guardianContext?{guardianContext}:{})};
}
