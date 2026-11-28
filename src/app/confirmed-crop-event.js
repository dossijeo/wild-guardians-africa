// Use the command publication itself: the presentation event ring can advance
// or evict this event before the promise continuation runs.
export function confirmedCropId(result,commandId){
 if(!Array.isArray(result?.events)||typeof commandId!=='string'||!commandId)return null;
 const event=result.events.find(item=>item?.type==='CropPlaced'&&item.commandId===commandId);
 return typeof event?.targetId==='string'&&event.targetId?event.targetId:null;
}
