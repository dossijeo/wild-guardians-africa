// Serializable, presentation-only lease. It never grants permission to cross
// an event/resource boundary or to advance the authoritative simulation.
export function evaluateRemoteClock(lease,absoluteNow){
 if(!lease||lease.version!==1||!Number.isFinite(absoluteNow)||!Number.isFinite(lease.epoch)||lease.epoch<0||!Number.isFinite(lease.elapsed)||lease.elapsed<lease.epoch||!Number.isFinite(lease.anchorAbsoluteMs)||!Number.isFinite(lease.safeUntil)||lease.safeUntil<lease.elapsed||typeof lease.paused!=='boolean'||!Array.isArray(lease.segments))throw TypeError('Invalid remote clock lease');
 let cursor=lease.elapsed;
 for(const segment of lease.segments){
  if(!segment||segment.start!==cursor||!Number.isFinite(segment.end)||segment.end<=cursor||!Number.isFinite(segment.rate)||segment.rate<=0||!Number.isFinite(segment.realDuration)||segment.realDuration<=0||Math.abs((segment.end-cursor)/segment.rate-segment.realDuration)>1e-8*Math.max(1,segment.realDuration))throw TypeError('Invalid remote clock segment');
  cursor=segment.end;
 }
 if(!lease.paused&&cursor<lease.safeUntil)throw TypeError('Remote clock horizon lacks coverage');
 if(lease.paused)return lease.elapsed;
 let remaining=Math.max(0,(absoluteNow-lease.anchorAbsoluteMs)/1000),elapsed=lease.elapsed;
 for(const segment of lease.segments){
  if(remaining<=0||elapsed>=lease.safeUntil)break;
  const used=Math.min(remaining,segment.realDuration);
  elapsed=Math.min(lease.safeUntil,segment.end,segment.start+used*segment.rate);
  remaining-=used;
 }
 return Math.max(lease.elapsed,Math.min(lease.safeUntil,elapsed));
}
