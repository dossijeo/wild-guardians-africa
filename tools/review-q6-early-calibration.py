"""Read retained native receipts only. No game imports, ticks or counterfactual replay."""
import argparse, collections, hashlib, json
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--evidence-root',required=True)
parser.add_argument('--out',required=True)
args=parser.parse_args()
base=Path(args.evidence_root)
result={'scope':'Read-only frozen9b6858a5 Q6 seven-day accounting; not marginal causal staffing effect or100-night acceptance','cases':{}}
for arm in ['no-walls','no-shield']:
    folder=base/f'pilot-pressure-9b6858a5-q6-{arm}-712-7'
    r=json.loads((folder/'report.json').read_text(encoding='utf-8'))
    source=json.loads((folder/'source.json').read_text(encoding='utf-8'))
    assert source['gitHead'].startswith('9b6858a5')
    deliveries=r['nativeEvidence']['deliveries']
    assert len({d['paymentId'] for d in deliveries})==len(deliveries)
    daily=[]
    for row in r['daily']:
        day=row['day'];f=row['finance'];ds=[d for d in deliveries if d['day']==day]
        assert len(ds)==row['delivered'] and sum(int(d['coins']) for d in ds)==f['income']
        assert abs(f['opening']+f['net']-f['closing'])<1e-6 and f['reconciliationDifference']==0
        seed_entries=[e for e in f['entries'] if e['category']=='seeds']
        assert all(e['coins']==-5 for e in seed_entries)
        obs=[o for o in r['labourObservations'] if o['day']==day]
        hires=[h for h in r['labourHistory'] if h['day']==day and h['kind']=='additional']
        paid_seconds=row['staff']*300+sum(h['count']*(300-h['time']) for h in hires)
        # This is paid contractual coverage, not observed working/busy time.
        replacement_margin=f['income']-len(ds)*5
        bands=[]
        for start,end in [(0,90),(90,180),(180,280),(280,300)]:
            decisions=[d for d in r['nativeEvidence']['decisions'] if d['day']==day and start<=d['time']<end]
            reasons=collections.defaultdict(float)
            for d in decisions:
                if not d['otherActions']: reasons[d['reason']]+=d['daylightSeconds']
            bands.append({'start':start,'end':end,'noAcceptedCommandSeconds':dict(reasons)})
        daily.append({'day':day,'opening':f['opening'],'closing':f['closing'],'staffAtDawn':row['staff'],'addedStaff':row['additionalStaff'],'wages':f['wages'],'seeds':f['seeds'],'physicalDeliveredIncome':f['income'],'delivered':row['delivered'],'planted':row['planted'],'destroyed':row['destroyed'],'living':row['living'],'pending':row['pendingTasks'],'nextPayrollReserve':row['nextLabourReserve'],'unoccupiedSeconds':row['unoccupiedSeconds'],'budgetReasonSeconds':row['idle']['budget'],'actions':row['actions'],'bands':bands,'checksBelowFullReserve':sum(o.get('workingCapitalShortfall',0)>0 for o in obs),'evaluatedChecks':len(obs),'paidContractCoverageSeconds':paid_seconds,'incomePerPaidCoverageSecond':f['income']/paid_seconds,'deliveredReplacementMargin':replacement_margin,'replacementMarginPerPaidCoverageSecond':replacement_margin/paid_seconds,'additionalHires':[{k:h[k] for k in ['time','count','paidCoins','required','measurement']} for h in hires]})
    result['cases'][arm]={'sourceHead':source['gitHead'],'sourceHashes':source['sourceHashes'],'originalHashes':{name:hashlib.sha256((folder/name).read_bytes()).hexdigest() for name in ['report.json','source.json','protocol.json','receipt.json','days.jsonl','state.json.gz']},'result':r['result'],'completedNights':r['completedNights'],'meaningfulActivity':r['nativeEvidence']['meaningfulActivity'],'daily':daily,'totals':{k:sum(d[k] for d in daily) for k in ['wages','seeds','physicalDeliveredIncome','delivered','planted','unoccupiedSeconds']}}
out=Path(args.out)
assert not out.exists(),'Do not overwrite diagnosis evidence'
out.parent.mkdir(parents=True,exist_ok=True)
out.write_bytes((json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
for arm,c in result['cases'].items():
    print(arm,c['totals'],'idle',c['meaningfulActivity']['unoccupiedFraction'])
