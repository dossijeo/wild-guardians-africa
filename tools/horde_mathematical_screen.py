"""Static QA cash/strike envelope. No time stepping, campaign or simulation imports."""
import argparse, base64, gzip, hashlib, itertools, json, math, unittest
from pathlib import Path
from audit_horde_threat_trace import audit

def loadzip(p):return json.loads(gzip.decompress(p.read_bytes()))
def loss_budget(allocated, spent_fraction, crop_fraction, shield_fraction, crop_hits=2):
    assert allocated>=0 and all(0<=v<=1 for v in [spent_fraction,crop_fraction,shield_fraction]) and crop_hits>0
    return allocated*spent_fraction*crop_fraction*(1-shield_fraction)/crop_hits

def net_margin(income,seeds,wages,extra_kills,replacement,lost_value,structure_strikes,damage,wall_cost=10,wall_hp=100,repair_success=1,defense_amortized=51.5):
    assert all(v>=0 for v in [income,seeds,wages,extra_kills,replacement,lost_value,structure_strikes,damage,defense_amortized])
    assert 0<repair_success<=1
    # Paid repair per HP, plus a conservative replacement/collapse factor.
    repair=structure_strikes*damage*(wall_cost/wall_hp)/repair_success
    return income-seeds-wages-extra_kills*(replacement+lost_value)-repair-defense_amortized

def compositions(balance,stage,tier):
    animals=balance['animals'];caps=stage['species_caps'];maximum=stage['max_animals']
    low=math.ceil(tier['threat_min']*stage['budget_scale']);high=math.ceil(tier['threat_max']*stage['budget_scale'])
    by_budget=[]
    for budget in [math.ceil(raw*stage['budget_scale']) for raw in range(tier['threat_min'],tier['threat_max']+1)]:
        options=[]
        ranges=[range(caps[i]+1) if a['id'] in tier['unlocked_species'] else range(1) for i,a in enumerate(animals)]
        for counts in itertools.product(*ranges):
            n=sum(counts);cost=sum(c*a['threat_cost'] for c,a in zip(counts,animals))
            if not min(stage['min_animals'],budget)<=n<=maximum or not math.ceil(balance['raids']['min_budget_spend_fraction']*budget)<=cost<=budget:continue
            options.append({'actors':n,'minimum':sum(c*a['hit_budget_min'] for c,a in zip(counts,animals)),'maximum':sum(c*a['hit_budget_max'] for c,a in zip(counts,animals)),'mean':sum(c*(a['hit_budget_min']+a['hit_budget_max'])/2 for c,a in zip(counts,animals)),'maxStructureHpDamage':sum(c*a['hit_budget_max']*a['structure_hit_damage'] for c,a in zip(counts,animals))})
        if options:by_budget.append(options)
    flat=[v for vs in by_budget for v in vs]
    assert flat
    return {'budgetRange':[low,high],'legalOptions':len(flat),'minimumStrikes':min(v['minimum'] for v in flat),'maximumStrikes':max(v['maximum'] for v in flat),'meanStrikesUniformBudgetAndComposition':sum(sum(v['mean'] for v in vs)/len(vs) for vs in by_budget)/len(by_budget),'maximumConcentratedStructureHpDamage':max(v['maxStructureHpDamage'] for v in flat)}

def screen(base,trace):
    frozen=loadzip(base/'frozen-source-files.json.gz')
    def source(name):return base64.b64decode(frozen['files'][name]['base64']).decode('utf-8')
    balance=json.loads(source('src/simulation/balance.js').split('export const BALANCE = ',1)[1].rsplit(';',1)[0])
    assert balance['initial_money']==1500 and balance['work_center']['cost']==800
    assert balance['workers']['older_wage']==30 and balance['workers']['young_wage']==40
    crops={c['id']:c for c in balance['crops']};proxies=[]
    for arm in ['responsible','neglect']:
        d=base/'native-original'/arm;r=loadzip(d/'report.json.gz');s=loadzip(d/'state.json.gz');cash=r['summary']['cashflow']
        proxies.append({'arm':arm,'dailyIncome':int(cash['harvestIncome'])/20,'dailySeeds':int(cash['seedCosts'])/20,'dailyWages':int(cash['wageCosts'])/20,'averageRealizedPayout':int(cash['harvestIncome'])/r['counts']['CrateDelivered'],'averageSeedPayment':int(cash['seedCosts'])/r['counts']['CropPlaced'],'destroyedPerDay':r['counts']['CropDestroyed']/20,'plantedPerDay':r['counts']['CropPlaced']/20,'lastPaidStaff':r['daily'][-1]['staff'],'terminalCash':r['money']})
    stages=[{'days':[s['first'],s['last']],**compositions(balance,s,balance['threat_tiers'][-1])} for s in balance['raids']['night_horde_stages']]
    day_stage={'max_animals':balance['raids']['max_animals'],'min_animals':1,'species_caps':[a['max_per_raid'] for a in balance['animals']],'budget_scale':1};day_tier={**balance['threat_tiers'][-1],'threat_min':7,'threat_max':10};day_envelope=compositions(balance,day_stage,day_tier)
    late=stages[-1];mean=late['meanStrikesUniformBudgetAndComposition']+.1*day_envelope['meanStrikesUniformBudgetAndComposition'];upper=late['maximumStrikes']+day_envelope['maximumStrikes']
    # Both arms use identical productivity proxy per scenario; never fit differing incomes as a defensive benefit.
    income_range=[min(p['dailyIncome'] for p in proxies),max(p['dailyIncome'] for p in proxies)]
    seed_range=[min(p['dailySeeds'] for p in proxies),max(p['dailySeeds'] for p in proxies)]
    wage_range=[min(p['dailyWages'] for p in proxies),max(p['dailyWages'] for p in proxies)]
    seed_unit=max(p['averageSeedPayment'] for p in proxies);payout=max(p['averageRealizedPayout'] for p in proxies)
    baseline_kills=min(p['destroyedPerDay'] for p in proxies)
    grid=[]
    for hits,yield_scale,damage_scale,seed_scale in itertools.product([1,2,4,8],[1,.75,.5,.35],[1,2,3],[1,1.25,1.5]):
        # Named CONDITIONAL exposure bounds, not fitted or guaranteed by historical geometry.
        outcomes={}
        for arm in ['responsible','neglect']:
            crop_bounds=[.15,.35] if arm=='responsible' else [.65,.9]
            shield_bounds=[.25,.4] if arm=='responsible' else [.15,.35]
            values=[]
            for daily_income,seeds,wages,spent,crop,shield,lost_fraction,service in itertools.product(income_range,seed_range,wage_range,[.7,1],crop_bounds,shield_bounds,[.5,1],[.5,1]):
                strikes=mean*hits; kills=loss_budget(strikes,spent,crop,shield)
                extra=max(0,kills-baseline_kills)
                structure_fraction=max(0,1-crop-.1)
                structure_strikes=strikes*spent*structure_fraction*(1-shield)
                # Neglect doesn't pay repairs here. Structure-collapse risk is tracked separately, not fictitious payments.
                values.append(net_margin(daily_income*yield_scale,seeds*seed_scale,wages,extra,seed_unit*seed_scale,payout*yield_scale*lost_fraction,structure_strikes if arm=='responsible' else 0,17.5*damage_scale,repair_success=service,defense_amortized=51.5 if arm=='responsible' else 0))
            outcomes[arm]={'dailyNetRange':[min(values),max(values)]}
        pass_conditional=outcomes['responsible']['dailyNetRange'][0]>0 and outcomes['neglect']['dailyNetRange'][1]<0
        grid.append({'hitBudgetMultiplier':hits,'yieldMultiplier':yield_scale,'structureDamageMultiplier':damage_scale,'seedPriceMultiplier':seed_scale,'conditionalScreenPass':pass_conditional,'outcomes':outcomes})
    no_contact={'spentFraction':0,'damageEffect':0,'reason':'Horde or damage changes cannot distinguish arms if attacks never contact assets.'}
    current_ceiling={}
    for lost_fraction in [0,.5,1]:
        worstkills=upper/2 # All allocated hits contact unshielded crops, no encounters/misses/unused.
        penalty=max(0,worstkills-baseline_kills)*(seed_unit+payout*lost_fraction)
        current_ceiling[str(lost_fraction)]={'freshCropDeathsPerNightPlusPossibleDayRaid':worstkills,'incrementalDailyPenalty':penalty,'minimumObservedDailyMarginMinusPenalty':min(p['dailyIncome']-p['dailySeeds']-p['dailyWages'] for p in proxies)-penalty,'maximumAlreadyOneHitCropDeaths':upper,'alreadyOneHitMarginStress':min(p['dailyIncome']-p['dailySeeds']-p['dailyWages'] for p in proxies)-max(0,upper-baseline_kills)*(seed_unit+payout*lost_fraction)}
    spells=balance['spells'];center=balance['work_center']
    return {'scope':'Static conditional parameter screen; estimates are not100night survival/defeat, cash trajectory, probabilities, repair feasibility or idle acceptance','frozenSource':frozen['gitHead'],'sourceHashes':{p:frozen['files'][p]['sha256'] for p in ['src/simulation/balance.js','src/simulation/raids.js','src/simulation/game.js','src/simulation/rules.js','tools/horde-defense-self-consistent-farm.mjs']},'fixed':{'initialMoney':1500,'centerCost':800,'elderWage':30,'youngWage':40,'cropHitsToDestroy':2},'balance':{'dayRaidEnvelope':day_envelope,'dayRaidProbability':.1,'dayRaidAttractionMinimum':10000,'spells':spells,'walls':balance['walls'],'stages':stages,'center':center},'empiricalProxies':proxies,'sameProductivityForBothArms':True,'empiricalStrikeConsumers':[{k:a[k] for k in ['arm','allocated','consumerTotals']} for a in trace['arms']],'conditionalAssumptions':{'spentFraction':[.7,1],'responsibleCropFraction':[.15,.35],'neglectCropFraction':[.65,.9],'responsibleShieldCoverage':[.25,.4],'neglectShieldCoverage':[.15,.35],'lostHarvestFraction':[.5,1],'repairServiceFactor':[.5,1],'wallCostPerHp':.1,'defenseAmortizedCoinsPerDay':51.5,'note':'Exposure and service bounds are proposed test conditions, not identified defensive efficacy. Lost yield0 is an additional failure-of-identification case.'},'zeroContactDegeneracy':no_contact,'currentLegalCeilingAtRetainedProductivity':current_ceiling,'unitLossSensitivity':{'averageSeed':seed_unit,'averageRealizedHarvest':payout,'maximumCanonicalSeed':max(c['plant_cost'] for c in crops.values()),'maximumFemaleHarvestWithMultiplyAndPositiveEvent':max(c['base_harvest_value'] for c in crops.values())*2*1.3,'warning':'High-value targeting can violate mean-payout stress assumption; this is not an impossibility proof for all crop mixes.'},'grid':grid,'conditionalShortlist':[g for g in grid if g['conditionalScreenPass']],'unconditionalRobustCandidates':[],'limits':['Linear repair approximation excludes integer-ceil per transaction; rounding can add less than one coin per successful repair and should be conservatively added before candidate approval','No evidence for positive structure-target fraction or defended enclosure efficacy','No hundred-night trajectory extrapolation; grid is stationary late-night plus0.1eligibledayraid expectation; stress ceiling allows one full dayraid regardlessprobability','Legal maximum is an allocation ceiling, not a GPU or physical contact measurement','Damage concentration/collapse and delayed repair are nonlinear and unmodelled in cash margins','Cash proxy already includes retained losses; incremental damage beyond baseline is an accounting stress estimate, not counterfactual fitting','Seed replacement assumes same stock is replenished; lost harvest uses realized paid crate average, not promised income','Yield changes could break initial liquidity/staffing; promising late margins require opening diagnostic','No probability estimate for distribution of survival or defeat from one20nightseed','Shield20/90 timing limits do not imply29%area coverage or fixed contact coverage']}

class ConservationTests(unittest.TestCase):
    def test_consumers(self):
        self.assertEqual(loss_budget(100,1,1,0),50);self.assertEqual(loss_budget(100,1,1,1),0);self.assertEqual(loss_budget(100,0,1,0),0)
    def test_money_units(self):
        self.assertEqual(net_margin(100,10,30,2,5,10,4,10,repair_success=1,defense_amortized=0),26)
    def test_legal_allocation(self):
        b={"animals":[{"id":"a","threat_cost":1,"hit_budget_min":2,"hit_budget_max":4,"structure_hit_damage":10}],"raids":{"min_budget_spend_fraction":.75}}
        e=compositions(b,{"max_animals":2,"min_animals":1,"species_caps":[2],"budget_scale":1},{"threat_min":1,"threat_max":2,"unlocked_species":["a"]})
        self.assertEqual(e["maximumStrikes"],8);self.assertEqual(e["meanStrikesUniformBudgetAndComposition"],4.5)
    def test_yield_units(self):
        self.assertEqual(net_margin(200,20,30,0,5,10,0,10,defense_amortized=0)-net_margin(100,20,30,0,5,10,0,10,defense_amortized=0),100)
    def test_bounds(self):
        with self.assertRaises(AssertionError):loss_budget(10,1,1,2)
        for shield in [0,.3,1]:self.assertLessEqual(loss_budget(96,1,.8,shield),48)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('archive',type=Path,nargs='?');p.add_argument('output',type=Path,nargs='?');p.add_argument('--self-test',action='store_true');args=p.parse_args()
    if args.self_test:
        suite=unittest.defaultTestLoader.loadTestsFromTestCase(ConservationTests);assert unittest.TextTestRunner().run(suite).wasSuccessful()
    else:
        assert args.archive and args.output;trace=audit(args.archive);result=screen(args.archive,trace);args.output.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps({'lateLegalEnvelope':result['balance']['stages'][-1],'currentCeiling':result['currentLegalCeilingAtRetainedProductivity'],'shortlist':result['conditionalShortlist']},indent=2))
