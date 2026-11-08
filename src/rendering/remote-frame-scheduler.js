import {evaluateRemoteClock} from './remote-presentation-clock.js';

function deadline(metadata) {
 const lease=metadata?.clock;
 if(!metadata?.preparedInterval||!lease||lease.paused)return null;
 let seconds=0,cursor=lease.elapsed;
 for(const segment of lease.segments){
  const end=Math.min(segment.end,lease.safeUntil);
  seconds+=(end-cursor)/segment.rate;cursor=end;
  if(cursor===lease.safeUntil)break;
 }
 return lease.anchorAbsoluteMs+seconds*1000;
}

// Preparation and presentation have different cursors. A prepared package is
// immutable, but its execution origin belongs to the consuming draw worker.
// An on-time successor inherits the existing timeline. A late successor starts
// only after receipt: the prior certified endpoint remains held in the gap.
export function scheduleRemoteFrame({metadata,previousMetadata=null,receivedAt,now}) {
 if(!Number.isFinite(receivedAt)||!Number.isFinite(now)||receivedAt>now)throw TypeError('Invalid remote frame scheduling time');
 const previousDeadline=deadline(previousMetadata);
 if(previousDeadline!==null&&now<previousDeadline)return {ready:false,readyAt:previousDeadline};
 const interval=metadata?.preparedInterval;
 if(!interval)return {ready:true,metadata};
 const lease=metadata.clock;
 if(!interval||!Number.isFinite(interval.start)||!Number.isFinite(interval.end)||interval.end<=interval.start||
    !lease||lease.paused||lease.elapsed!==interval.start||lease.safeUntil!==interval.end)throw Error('Prepared frame requires a complete autonomous clock lease');
 evaluateRemoteClock(lease,lease.anchorAbsoluteMs);
 const contiguous=previousDeadline!==null&&previousMetadata.clock.safeUntil===interval.start;
 const anchorAbsoluteMs=contiguous&&receivedAt<=previousDeadline?previousDeadline:Math.max(receivedAt,previousDeadline??receivedAt);
 return {ready:true,metadata:{...metadata,clock:{...lease,anchorAbsoluteMs}}};
}
