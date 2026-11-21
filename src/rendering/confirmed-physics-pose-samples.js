// Validate the optional authority observations before they cross into the
// presentation. This does not certify interpolation, contacts or playback.
export function validateConfirmedPhysicsPoseSamples(trace,message){
 const data=trace.physicsPoseSamples;if(data===undefined)return;
 if(!data||data.version!==1||typeof data.complete!=='boolean'||!Array.isArray(data.samples)||data.samples.length>128)throw TypeError('Invalid observed physics samples');
 if(!data.complete){if(typeof data.reason!=='string'||!data.reason||data.samples.length)throw TypeError('Invalid incomplete physics samples');return;}
 if(data.reason!==undefined||data.samples.length<2||trace.physicsActivity?.samplesComplete!==true||trace.physicsActivity.observed!==true)throw TypeError('Invalid complete physics samples');
 const validTransform=value=>Array.isArray(value)&&value.length===10&&value.every(Number.isFinite),bonesById=new Map();let previous=null;
 for(const frame of data.samples){
  if(!frame||!Number.isFinite(frame.at)||frame.at<trace.start||frame.at>trace.end||!Number.isSafeInteger(frame.step)||frame.step<1||previous&&(frame.at<=previous.at||frame.step!==previous.step+1)||!Array.isArray(frame.poses)||!frame.poses.length||frame.poses.length>128)throw TypeError('Invalid observed physics frame');
  const ids=new Set();for(const pose of frame.poses){if(!pose||typeof pose.actorId!=='string'||!pose.actorId||ids.has(pose.actorId)||pose.active!==true||pose.visualTransition!==undefined||!validTransform(pose.root)||!validTransform(pose.model)||!Array.isArray(pose.bones)||pose.bones.length>256)throw TypeError('Invalid observed physics pose');ids.add(pose.actorId);const names=new Set();for(const bone of pose.bones){if(typeof bone?.name!=='string'||!bone.name||names.has(bone.name)||!validTransform(bone.transform))throw TypeError('Invalid observed physics bone');names.add(bone.name);}const signature=pose.bones.map(bone=>bone.name).join('\u0000');if(bonesById.has(pose.actorId)&&bonesById.get(pose.actorId)!==signature)throw TypeError('Changed observed physics rig');bonesById.set(pose.actorId,signature);}
  if(!Array.isArray(frame.bounds)||frame.bounds.length!==ids.size)throw TypeError('Invalid observed physics bounds');const bounded=new Set();for(const box of frame.bounds){if(!ids.has(box?.actorId)||bounded.has(box.actorId)||![box.minX,box.maxX,box.minZ,box.maxZ].every(Number.isFinite)||box.minX>box.maxX||box.minZ>box.maxZ)throw TypeError('Invalid observed physics bounds');bounded.add(box.actorId);}
  if(previous&&(previous.ids.size!==ids.size||[...ids].some(id=>!previous.ids.has(id))))throw TypeError('Changed observed physics actors');previous={...frame,ids};
 }
 if(data.samples[0].at!==trace.start||previous.at!==trace.end)throw TypeError('Incomplete observed physics interval');
 // Restoring Three's matrices after observation can round a quaternion by a
 // few ulps; do not reject an otherwise identical authoritative endpoint.
 const sameTransform=(a,b)=>validTransform(b)&&a.every((value,i)=>Math.abs(value-b[i])<=1e-10),samePose=(a,b)=>b?.active===true&&b.actorId===a.actorId&&b.visualTransition===undefined&&sameTransform(a.root,b.root)&&sameTransform(a.model,b.model)&&Array.isArray(b.bones)&&a.bones.length===b.bones.length&&a.bones.every((bone,i)=>bone.name===b.bones[i]?.name&&sameTransform(bone.transform,b.bones[i].transform));
 const final=message.physicsPoses??(message.physicsPose?[message.physicsPose]:[]),byId=new Map(final.filter(pose=>pose?.active).map(pose=>[pose.actorId,pose]));if(byId.size!==previous.ids.size||previous.poses.some(pose=>!samePose(pose,byId.get(pose.actorId))))throw TypeError('Observed physics endpoint mismatch');
}
