// A result stays provisional until the visual worker accepts the replacement.
// Keep the new marker ID on the original pending record so the caller can
// cancel it if publication throws or the owning generation is replaced.
export function publishResolvedVillagePreview({pending,value,feedback,client,ground,makeId,remove,show}){
 if(!pending||!value||typeof ground!=='function'||typeof makeId!=='function'||typeof remove!=='function'||typeof show!=='function')throw TypeError('Invalid village preview handoff');
 let feedbackId=null;
 if(pending.feedbackId&&feedback){const id=makeId(),y=ground(value.x,value.z);if(feedback.bind(id,{x:value.x,y,z:value.z},client))feedbackId=id;else remove(pending.feedbackId,client);pending.feedbackId=feedbackId;}
 const resolved=feedbackId?{...value,feedbackId}:value;show(resolved);return resolved;
}
