"""Algebraic late-state QA estimates only; no simulation or game imports."""
import argparse,base64,gzip,hashlib,itertools,json,math,unittest
from pathlib import Path

def interval(income,seed,wages,good_kills,bad_kills,unit_seed,payout,loss,repair,defense,good_goal=500,bad_goal=500,rounding=213):
    assert income>0 and all(v>=0 for v in [seed,wages,good_kills,bad_kills,unit_seed,payout,loss,repair,defense,good_goal,bad_goal,rounding])
    ag=income-good_kills*payout*loss;ab=income-bad_kills*payout*loss
    cg=seed+wages+good_kills*unit_seed+repair+defense;cb=seed+wages+bad_kills*unit_seed
    assert ag>0 and ab>0,'Income coefficient not positive; inequality direction/case must be handled separately'
    return {'lowerY':(cg+good_goal+rounding)/ag,'upperY':(cb-bad_goal-rounding)/ab,'goodCoefficient':ag,'badCoefficient':ab,'goodCosts':cg,'badCosts':cb,'roundingCoinsPerDay':rounding,'goodMarginGoal':good_goal,'badNegativeGoal':bad_goal}
def margins(y,v):return {'goodAfterAdverseRounding':v['goodCoefficient']*y-v['goodCosts']-v['roundingCoinsPerDay'],'badAfterAdverseRounding':v['badCoefficient']*y-v['badCosts']+v['roundingCoinsPerDay']}
def envelope(b,stage):
    animals=b['animals'];caps=stage['caps'];rows=[]
    for raw in range(10,15):
        budget=math.ceil(raw*stage['scale']);options=[]
        for counts in itertools.product(*[range(cap+1) for cap in caps]):
            actors=sum(counts);cost=sum(n*a['threat_cost'] for n,a in zip(counts,animals))
            if 6<=actors<=stage['cap'] and math.ceil(.75*budget)<=cost<=budget:
                options.append((actors,sum(n*(a['hit_budget_min']+a['hit_budget_max'])/2 for n,a in zip(counts,animals))))
        assert options,'A possible original budget roll has no legal composition'
        rows.append((sum(v[0] for v in options)/len(options),sum(v[1] for v in options)/len(options)))
    return {'meanNightActors':sum(r[0] for r in rows)/5,'meanNightStrikes':sum(r[1] for r in rows)/5,'stage':stage,'hitBudgetsPerAnimal':'unchanged original2-8; this is a hypothetical raised actor/composition cap'}
def derive(input_path,frozen_path):
    r=json.loads(input_path.read_text(encoding='utf-8'));f=json.loads(gzip.decompress(frozen_path.read_bytes()))
    s=base64.b64decode(f['files']['src/simulation/balance.js']['base64']).decode('utf-8');b=json.loads(s.split('export const BALANCE = ',1)[1].rsplit(';',1)[0]);p=r['empiricalProxies'];avg=lambda key:sum(v[key] for v in p)/2
    income,seeds,wages,payout,unit_seed,baseline=[avg(k) for k in ['dailyIncome','dailySeeds','dailyWages','averageRealizedPayout','averageSeedPayment','destroyedPerDay']]
    day_expected=.1*r['balance']['dayRaidEnvelope']['meanStrikesUniformBudgetAndComposition'];base_budget=r['balance']['stages'][-1]['meanStrikesUniformBudgetAndComposition']+day_expected
    def calculate(B,cg,cb,sg,sb,rounding=353):
        g=max(0,B*.9*cg*(1-sg)/2-baseline);bad=max(0,B*.9*cb*(1-sb)/2-baseline)
        maintenance=B*.9*max(0,.9-cg)*(1-sg)*17.5*.1/.75
        return interval(income,seeds,wages,g,bad,unit_seed,payout,.75,maintenance,51.5,rounding=rounding)
    central={'spent':.9,'goodCropTargets':.25,'badCropTargets':.775,'goodShield':.325,'badShield':.25,'lostHarvest':.75,'repairService':.75,'verified':False}
    central_rows=[]
    for multiplier in [2,4,8]:
        B=base_budget*multiplier;v=calculate(B,.25,.775,.325,.25)
        central_rows.append({'aggregateStrikeMultiplier':multiplier,'effectiveAllocatedBudget':B,**v,'hasInterval':v['lowerY']<v['upperY'],'notIndividualHitRecommendation':True})
    hypothetical=envelope(b,{'cap':24,'scale':12,'caps':[12,8,6,5,4]})
    B=hypothetical['meanNightStrikes']+day_expected
    strong={'spent':.9,'goodCropTargets':.1,'badCropTargets':.9,'goodShield':.35,'badShield':.15,'lostHarvest':.75,'repairService':.75,'verified':False,'criticalAssumption':'90% fewer crop target contacts is not established by the original paid rectangle.'}
    v=calculate(B,.1,.9,.35,.15);candidates=[]
    for y in [.4,.405,.41]:
        m=margins(y,v)
        if m['goodAfterAdverseRounding']>500 and m['badAfterAdverseRounding']< -500:
            candidates.append({'yieldScaleAggregate':y,'allocatedStrikesMean':B,'actorEnvelope':hypothetical,'margins':m,'classification':'CONDITIONAL diagnostic point only; narrow continuous interval, not ready integer-price/robust/100night candidate','tooNarrowForPriceMapping':v['upperY']-v['lowerY']<.005,'structureDamageMultiplier':1,'firstFiveDays':'unchanged is an explicit conditional phase assumption; changing later payouts needs named experiment approval. Alternatively retaining mijo33 requires an exact integer crop-price mapping and recalibration.'})
    # Neglect threshold at original payout; positive lost-value coefficient.
    V=unit_seed+payout*.75;threshold_B=2*(income-seeds-wages+baseline*V+500+213)/(.9*.775*.75*V)
    thresholds=[]
    for y in [.4,.405,1]:
        A=B*.9*.65/2;K=B*.9*.65*17.5*.1/.75;V=unit_seed+payout*y*.75
        peak_crop=baseline/A
        peak_margin=margins(y,calculate(B,peak_crop,.9,.35,.15))['goodAfterAdverseRounding']
        numerator=income*y-seeds-wages+baseline*V-K*.9-51.5-353-500
        denominator=A*V-K
        assert denominator>0
        maximum=min(.9,numerator/denominator) if peak_margin>500 else None
        thresholds.append({'y':y,'maximumGoodCropTargetFractionFor500CoinsGoal':maximum,'requiredReductionVsBadCropFractionPoint9':1-maximum/.9 if maximum is not None else None,'maximumPossibleGoodMarginAtKink':peak_margin,'badMarginAtPoint':margins(y,calculate(B,.1,.9,.35,.15))['badAfterAdverseRounding'],'equation':'cGoodMax=(I*y-S-W+D*V-K*.9-defense-rounding-goal)/(A*V-K), A=B*q*(1-shieldGood)/2, K=B*q*(1-shieldGood)*damage*wallCostPerHP/service, V=seedUnit+payout*y*loss; valid on positive-extra-kills branch only'})
    same_shield=[]
    for shield in [.15,.25,.35]:
        x=calculate(B,.1,.9,shield,shield,303+math.ceil(B*.9*.8*(1-shield)))
        same_shield.append({'sameShieldCoverage':shield,**x,'hasInterval':x['lowerY']<x['upperY'],'tooNarrowForPriceMapping':x['upperY']-x['lowerY']<.005})
    originals=frozen_path.parent/'native-original';day5={};day20={};source_reports={}
    for arm in ['responsible','neglect']:
        report_path=originals/arm/'report.json.gz';rr=json.loads(gzip.decompress(report_path.read_bytes()));day5[arm]=next(d for d in rr['daily'] if d['day']==5);day20[arm]=next(d for d in rr['daily'] if d['day']==20);source_reports[arm]=hashlib.sha256(report_path.read_bytes()).hexdigest()
    buffers=[]
    for d,record in [(5,day5['neglect']),(20,day20['neglect'])]:
        buffers.append({'originalObservedDay':d,'cash':record['money'],'observedNextWageReserve':record['nextLabourReserve'],'nativeMinimumWithOperationalCenterAndLivingCrops':30,'atConstant500DeficitDaysUntil30':math.ceil((record['money']-30)/500),'atConstant500DeficitDaysUntilObservedWageReserve':math.ceil((record['money']-record['nextLabourReserve'])/500),'requiredDailyDeficitToReach30Before100':(record['money']-30)/(100-d),'limitation':'Static buffer division only. These are original unchanged-arm balances; not cash forecast after candidate prices/stock/hordes change.'})
    scenarios=[]
    for cb,sb,loss in itertools.product([.775,.9],[.15,.25],[.5,.75,1]):
        bad=max(0,B*.9*cb*(1-sb)/2-baseline);good=max(0,B*.9*.1*.65/2-baseline);repair=B*.9*.8*.65*17.5*.1/.75
        x=interval(income,seeds,wages,good,bad,unit_seed,payout,loss,repair,51.5)
        scenarios.append({'badCropFraction':cb,'badShieldFraction':sb,'lostHarvestFraction':loss,'interval':[x['lowerY'],x['upperY']],'valid':x['lowerY']<x['upperY']})
    return {'scope':'Continuous stationary algebraic estimates, no simulation, empirical survival distribution, production promotion or100night claim','source':r['frozenSource'],'inputSha256':hashlib.sha256(input_path.read_bytes()).hexdigest(),'fixed':r['fixed'],'equations':['goodNet(y)=Ag*y-Cg','badNet(y)=Ab*y-Cb','lowerY=(Cg+marginGoal+rounding)/Ag','upperY=(Cb-negativeGoal-rounding)/Ab','admissible only lowerY<y<upperY and Ag,Ab>0'],'centralUnverifiedScenario':central,'centralStrikeMultipliers':central_rows,'strongUnverifiedExposureHypothesis':strong,'hypotheticalHordeEnvelope':hypothetical,'strongHypothesisContinuousInterval':v,'conditionalCandidates':candidates,'pairedSameShieldSensitivity':same_shield,'sourceReportSHA256':source_reports,'cashBufferBounds':buffers,'sensitivity':scenarios,'originalPayoutNeglectThreshold':{'allocatedStrikesPerDay':threshold_B,'timesOriginalExpectedBudget':threshold_B/base_budget,'approxActorsAtHypotheticalMeanHitsPerActor':threshold_B/(hypothetical['meanNightStrikes']/hypothetical['meanNightActors']),'scope':'Original payout under central neglect contacts; not acceptable actor count without CPU/path/visual validation'},'protectionThresholds':thresholds,'openingStatic':{'firstDayOriginalPaidDeliveries':25,'mijoPayout':33,'firstDayIncome':825,'firstDayPlants':116,'firstDayAdditionalSeeds':116,'initialSeedCost':5,'firstDaySeedCost':585,'firstDayElderWages':210,'centerCost':800,'initialMoney':1500,'originalEndingCash':730,'nextObservedWageReserve':480,'maintenanceReserve':100,'minimumGlobalYForSameObservedDay1And580Reserve':(580+95)/825,'candidateGlobalYPoint4EndingCash':-95+825*.4,'interpretation':'Uniform global price cut fails observed next labour/maintenance reserve. Keep introduction/mijo unchanged or redesign and separately measure opening; unchanged count is not predicted after later costs diverge.'},'rounding':{'coinsPerDelivery':1,'dailyBound':353,'deliveryPeakRetained':303,'assumedMeanRepairPaymentBound':50,'source':'303 original peak daily deliveries plusceil(~50hypothetical damaging structure contacts) as positive repair-charge rounding allowance; no validated bound for changed future farms','basePriceMapping':'Round intended crop base prices upward to integers first, recompute effective weighted yield, then allow less than1extra coin per paid transaction. Do not interpret aggregatey as an exact per-crop multiplier or ignore price-rounding/mix changes.','repairRounding':'Add less than1coin per actual repair payment, number unknown because original paid repairs0; candidates require recomputation with retained payment counts.'},'noUnconditionalCandidates':True,'constraints':['Rules currently reject maxAnimals>12;24actor envelope requires an explicitly approved isolated candidate change and performance/physical QA, never silently applied','Early five nights remain original single-species intro with20%destruction limit; late arithmetic cannot set early damage','Do not increase individual hit budgets to achieve aggregate pressure; actor counts/composition constraints must be tested','No assigned injury/failure probability or guarantee of<25%idle','Conditional margins depend on unverified crop exposure reduction, shield coverage, replacement/lost harvest and timely paid repairs','Currentlastcenter economic guard must be explicitly resolved before converting centre collapse into defeat']}

class Tests(unittest.TestCase):
    def test_inverse(self):
        v=interval(100,10,20,1,4,2,10,.5,3,1,good_goal=5,bad_goal=5,rounding=1)
        self.assertAlmostEqual(margins(v['lowerY'],v)['goodAfterAdverseRounding'],5)
        self.assertAlmostEqual(margins(v['upperY'],v)['badAfterAdverseRounding'],-5)
    def test_units(self):
        v=interval(100,10,20,0,0,2,10,.5,0,0,good_goal=0,bad_goal=0,rounding=0)
        self.assertEqual(v['lowerY'],.3);self.assertEqual(v['upperY'],.3)
    def test_direction(self):
        with self.assertRaises(AssertionError):interval(1,0,0,1,1,1,10,1,0,0)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('input',type=Path,nargs='?');p.add_argument('frozen',type=Path,nargs='?');p.add_argument('output',type=Path,nargs='?');p.add_argument('--self-test',action='store_true');a=p.parse_args()
    if a.self_test:assert unittest.TextTestRunner().run(unittest.defaultTestLoader.loadTestsFromTestCase(Tests)).wasSuccessful()
    else:
        r=derive(a.input,a.frozen);a.output.write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps({'central':r['centralStrikeMultipliers'],'conditionalInterval':r['strongHypothesisContinuousInterval'],'candidates':r['conditionalCandidates'],'threshold':r['originalPayoutNeglectThreshold']},indent=2))
