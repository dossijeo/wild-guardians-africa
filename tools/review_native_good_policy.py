"""Read-only retained-report review; no Game imports, simulation or source edits."""
import json,hashlib,collections
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CASES=['pilot-43bb06b7-good-712','pilot-policy-v3-good-712-2days']
def audit():
 out=[]
 for name in CASES:
  d=ROOT/'docs/qa/native-economic-balance'/name
  raw=(d/'report.json').read_bytes();r=json.loads(raw)
  source=json.loads((d/'source.json').read_text(encoding='utf8'))
  reasons=collections.defaultdict(float)
  for x in r['nativeEvidence']['decisions']:
   if not x['otherActions']:reasons[x['reason']]+=x['daylightSeconds']
  h=r['defense']['history'];gaps=collections.Counter()
  for x in h:
   if x['paidPieces']:gaps.update(q['reason'] for q in x['gaps'])
  # Repeated gap observations are counts of observations, NOT unique holes.
  out.append({'case':name,'reportSHA256':hashlib.sha256(raw).hexdigest(),'sourceHead':source['gitHead'],'meaningfulActivity':r['nativeEvidence']['meaningfulActivity'],'idleDaylightByReason':dict(reasons),'wallAttempts':len(h),'zeroFundsAttempts':sum(x['availablePieces']==0 for x in h),'paidWallOrders':sum(x['paidPieces']>0 for x in h),'paidPieces':r['defense']['paidPieces'],'paidCost':r['defense']['paidCost'],'gateCount':sum(x.get('gates',0) for x in h),'paidRepairDecisionCredits':r['nativeEvidence']['meaningfulActivity']['creditedPaidRepairDecisionCount'],'gapReasonObservations':dict(gaps),'days':[{k:x[k] for k in ['day','before','money','wages','planted','living','finance','daylightSeconds','unoccupiedSeconds']} for x in r['daily']]})
 return {'scope':'Retained original reports only; no counterfactual native run, physical closure or performance claim','cases':out}
if __name__=='__main__':print(json.dumps(audit(),indent=2))
