"""Frozen-ledger, constant-price analytical QA. Does not run a game or change assets."""
import argparse,base64,gzip,hashlib,itertools,json,math,unittest
from fractions import Fraction
from pathlib import Path
from horde_continuous_interval import envelope

def ceil(v): return -(-v.numerator//v.denominator)
def repair(cost,hp,maximum,ruined=False):
    assert cost>=0 and maximum>0 and 0<=hp<=maximum
    return cost if ruined else ceil(Fraction(cost)*(maximum-hp)/maximum)
def refund(cost,hp,maximum,status='intact'):
    assert maximum>0
    return 0 if status in ['ruined','collapsing'] or hp<=0 else ceil(Fraction(cost)*min(hp,maximum)/maximum)
def paid(crates,prices,old):
    return sum(ceil(Fraction(int(c['value']['n']),int(c['value']['d']))*prices[c['species']]/old[c['species']]) for c in crates if c['delivered'])
def read(path):return json.loads(gzip.decompress(path.read_bytes()))
def derive(root):
    frozen=root/'frozen-source-files.json.gz';f=read(frozen)
    src=base64.b64decode(f['files']['src/simulation/balance.js']['base64']).decode('utf-8')
    b=json.loads(src.split('export const BALANCE = ',1)[1].rsplit(';',1)[0])
    crops=b['crops'];old={c['id']:c['base_harvest_value'] for c in crops}
    states={a:read(root/'native-original'/a/'state.json.gz') for a in ['responsible','neglect']}
    reports={a:read(root/'native-original'/a/'report.json.gz') for a in states}
    original={a:paid(s['crates'],old,old) for a,s in states.items()}
    # All paid delivery coins are retained; enforce identity against ledger credit.
    for a,s in states.items():
        credits=sum(int(v['n'])//int(v['d']) for v in s['ledger']['entries'].values() if int(v['n'])>0)
        assert credits==original[a],(a,credits,original[a])
    mathinput=json.loads((root.parent/'horde-threat-audit-e040ea6f'/'mathematical-screen.json').read_text(encoding='utf-8'))
    proxies=mathinput['empiricalProxies'];avg=lambda k:sum(v[k] for v in proxies)/2
    seeds,wages,unitseed,baseline=[avg(k) for k in ['dailySeeds','dailyWages','averageSeedPayment','destroyedPerDay']]
    day=.1*mathinput['balance']['dayRaidEnvelope']['meanStrikesUniformBudgetAndComposition']
    h=[envelope(b,t) for t in [{'cap':24,'scale':9,'caps':[12,8,6,5,4]},{'cap':24,'scale':12,'caps':[12,8,6,5,4]},{'cap':32,'scale':12,'caps':[20,12,10,8,5]}]]
    mapped={}
    for mijoprice,tick in itertools.product([33,24,20],range(250,501,5)):
        factor=Fraction(tick,1000);prices={k:(mijoprice if k=='mijo' else ceil(Fraction(v)*factor)) for k,v in old.items()}
        incomes={a:paid(st['crates'],prices,old)/20 for a,st in states.items()}
        mapped[(mijoprice,tick)]=(prices,incomes)
    rows=[]
    for hh,wallscale,shield,goodcrop in itertools.product(h,[.25,.4,.5,.6],[.15,.25,.35],[.1,.2,.3]):
        budget=hh['meanNightStrikes']+day;good=max(0,budget*.9*goodcrop*(1-shield)/2-baseline);bad=max(0,budget*.9*.9*(1-shield)/2-baseline)
        wallcosts={w['id']:math.ceil(w['cost']*wallscale) for w in b['walls']}
        # Hypothetical good-only structure pressure + timely repair, not observed efficacy.
        repair_contacts=budget*.9*(.9-goodcrop)*(1-shield)/.75
        repair_charge=repair(wallcosts['zarzas'],70,100)
        repairs=repair_contacts*repair_charge
        capital=103*wallcosts['zarzas']/20
        for mijoprice,tick in itertools.product([33,24,20],range(250,501,5)):
            factor=Fraction(tick,1000);prices,incomes=mapped[(mijoprice,tick)]
            realized=sum(incomes.values())*20/sum(sum(c['delivered'] for c in s['crates']) for s in states.values())
            value=unitseed+realized*.75
            ng=incomes['responsible']-seeds-wages-good*value-repairs-capital-303
            nb=incomes['neglect']-seeds-wages-bad*value+303
            row={'horde':hh,'sameShieldCoverage':shield,'goodCropContactFraction':goodcrop,'badCropContactFraction':.9,'otherCropFactor':float(factor),'cropPayouts':prices,'wallScale':wallscale,'wallCosts':wallcosts,'meanAllocatedStrikes':budget,'weightedRealizedIncomePerDay':incomes,'effectiveAggregateYield':sum(incomes.values())/(sum(original.values())/20),'extraLostCropsPerDay':{'good':good,'bad':bad},'repairCoinsPerDayIntegerCharged':repairs,'hypotheticalRepairContactsPerDay':repair_contacts,'repairChargePerContactWorst30HPOrdinaryWall':repair_charge,'defenseCapitalCoinsPerDay':capital,'roundingBound':303,'goodNetAdverse':ng,'neglectNetAdverse':nb,'batchFourContactRepairCoinsPerDay':repair_contacts*wallcosts['zarzas']/4,'batchFourGoodNet':ng+repairs-repair_contacts*wallcosts['zarzas']/4,'conditionalPass':ng>500 and nb< -500}
            rows.append(row)
    accepted=[r for r in rows if r['conditionalPass'] and .4<=r['effectiveAggregateYield']<=.6]
    selected=[]
    for cap,mijo in [(24,33),(24,20),(32,33)]:
        options=[r for r in accepted if r['horde']['stage']['cap']==cap and r['cropPayouts']['mijo']==mijo]
        if options:selected.append(max(options,key=lambda r:min(r['goodNetAdverse'],-r['neglectNetAdverse'])))
    robust=0
    for r in selected:
        peers=[p for p in rows if p['cropPayouts']==r['cropPayouts'] and p['wallScale']==r['wallScale'] and p['horde']==r['horde']]
        r['exposureSensitivity']=[{'sameShield':p['sameShieldCoverage'],'goodCropFraction':p['goodCropContactFraction'],'good':p['goodNetAdverse'],'bad':p['neglectNetAdverse'],'passes':p['conditionalPass']} for p in peers]
        r['allExposureEndpointsPass']=all(p['conditionalPass'] for p in peers)
        robust+=r['allExposureEndpointsPass']
    # Continuous aggregate-y diagnostic, separate from the exact integer-price rows.
    intervals=[]
    I=sum(original.values())/40;P=avg('averageRealizedPayout')
    for hh,ws in itertools.product(h,[.25,.4,.5,.6]):
        B=hh['meanNightStrikes']+day;g=max(0,B*.9*.1*.85/2-baseline);n=max(0,B*.9*.9*.85/2-baseline);wc=math.ceil(10*ws)
        cg=seeds+wages+g*unitseed+B*.9*.8*.85*repair(wc,70,100)/.75+103*wc/20
        cb=seeds+wages+n*unitseed;ag=I-g*P*.75;ab=I-n*P*.75
        lo=(cg+803)/ag;hi=(cb-803)/ab
        intervals.append({'hordeCap':hh['stage']['cap'],'threatScale':hh['stage']['scale'],'wallScale':ws,'lowerAggregateY':lo,'upperAggregateY':hi,'width':hi-lo,'sameShield':.15,'unverifiedGoodCrop':.1})
    return {'scope':'Analytical constant-price candidates, not temporal simulation, activity or100-night acceptance','frozenSource':mathinput['frozenSource'],'frozenPayloadSHA256':hashlib.sha256(frozen.read_bytes()).hexdigest(),'originalPaidIncome':original,'fixed':{'center':800,'start':1500,'elder':30,'young':40,'cropHits':2,'individualHitBudgets':'unchanged','seedPrices':'unchanged','mijo':'constant candidate33/24/20; productionmain11 distinct','HPAndGateHP':'unchanged','magicEffort':'paired identical; geometric contact coverage hypothetical'},'rowCount':len(rows),'conditionalRowsWithinYieldRange':len(accepted),'robustSelectedCount':robust,'selected':selected,'continuousAggregateDiagnostics':intervals,'opening':{'reducedMijoBudgetWithoutAnyDelivery':1500-800-3*30-40*5,'adjustedPolicy':'3elders+40mijo seeds, leaves410 and minimum30hire reserve before any delivery. Arithmetic solvency only; physical throughput/activity not proven.','sameObservedDay1Cash':1500-800-5-580-210+825,'observedReserve':580,'note':'mijo33 constant; unchanged counts are an opening identity, not prediction'},'limitations':['Original defence caused zero structure hits and paid repairs; no calibrated protection efficacy.','Cheaper walls also proportionally reduce repair and refund. They do not increase neglect losses directly.','303 delivery rounding bound; each hypothetical repair contact charged ceil(cost*30HP/100) separately, using largest original single-hit damage. Fractional mean contact count is expectation, not a fractional transaction. Gate60HP sensitivity requires separate check.','Income/species/seed/staff mixes frozen from original20nights; changed price choices may change stock, labor and idle.','No probability of survival, defeat or100-night viability follows from stationary daily margins.','Repeated single-contact repair is a pessimistic scenario, not actual command policy: batch4 contacts capsdamageat100HP and rebuild3coins, chargepercontact3/4; actual completion counts required.','Only walls physically intercepting attack paths and actual completed paid repair count as useful defensive activity.'],'shortPilotProtocol':{'authorization':'NOT LAUNCHED; parent review first','duration':'bounded opening and first late-horde20night paired pilot; never100matrix before review','paired':'same seed, crop choice/productive effort and magic commands; paid evolving enclosure/repair differs only','telemetry':['allocated/spent/contact/missed/shielded/unused strikes','target ID/species/value and route entry/exit positions','physical deliveries vslogical tasks','wall actual applied pieces on attack routes/gates/omissions','repair arrival, coins paid, HP restored, interrupted unpaid tasks','productive idle plus meaningful build and paidrepair activity separately','native result and cash/labor reserve; source hashes'],'gate':'Reject unverified exposure or non-intercepting defence even if margins look favorable; retain failure unchanged'}}

class Tests(unittest.TestCase):
    def test_integer_repair(self):self.assertEqual(repair(35,73,100),10);self.assertEqual(repair(3,99,100),1)
    def test_refund_gate_fraction(self):self.assertEqual(refund(3,Fraction(27,2),60),1);self.assertEqual(refund(3,60,60),3)
    def test_no_refund_loop_profit(self):
        for cost,hp in itertools.product([3,5,9,14,20,800],range(1,101)):
            self.assertLessEqual(refund(cost,hp,100),cost)
            self.assertLessEqual(refund(cost,100,100)-repair(cost,hp,100),refund(cost,hp,100))
    def test_collapsed(self):self.assertEqual(refund(35,10,100,'collapsing'),0);self.assertEqual(repair(35,0,100,True),35)
    def test_labor_opening(self):self.assertEqual(7*30,210);self.assertEqual(1500-800-5-580-210+25*33,730);self.assertGreaterEqual(730,580)
    def test_historical_cost(self):
        self.assertEqual(repair(10,73,100),3);self.assertEqual(repair(3,73,100),1)
        self.assertEqual(refund(10,73,100),8);self.assertEqual(refund(3,73,100),3)
    def test_delivery_ceil(self):self.assertEqual(paid([{'delivered':True,'species':'a','value':{'n':'13','d':'2'}}],{'a':3},{'a':5}),4)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('root',type=Path,nargs='?');p.add_argument('output',type=Path,nargs='?');p.add_argument('--self-test',action='store_true');a=p.parse_args()
    if a.self_test:assert unittest.TextTestRunner().run(unittest.defaultTestLoader.loadTestsFromTestCase(Tests)).wasSuccessful()
    else:
        r=derive(a.root);a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps({'rows':r['rowCount'],'conditional':r['conditionalRowsWithinYieldRange'],'selected':r['selected']},indent=2))
