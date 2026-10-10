"""Local-area pressure arithmetic and deterministic selection prototype; no simulation."""
import argparse,base64,gzip,hashlib,itertools,json,math,unittest
from pathlib import Path

def select(plants,center,radius,maximum,clear=lambda a,b:True,protected=lambda p:False):
    x,z=center
    candidates=[p for p in plants if p.get('alive') and (p['x']-x)**2+(p['z']-z)**2<=radius**2 and clear(center,(p['x'],p['z'])) and not protected(p)]
    return sorted(candidates,key=lambda p:((p['x']-x)**2+(p['z']-z)**2,p['id']))[:maximum]
def pressure(value,maximum,v0=10000):return 1+(maximum-1)*max(0,value)/(max(0,value)+v0)
def envelope(animals,cap,scale,caps):
    rows=[]
    for raw in range(10,15):
        budget=math.ceil(raw*scale);options=[]
        for counts in itertools.product(*[range(n+1) for n in caps]):
            n=sum(counts);cost=sum(a['threat_cost']*c for a,c in zip(animals,counts))
            if (1 if cap==5 else 6)<=n<=cap and math.ceil(.75*budget)<=cost<=budget:options.append((n,sum(c*(a['hit_budget_min']+a['hit_budget_max'])/2 for a,c in zip(animals,counts))))
        assert options
        rows.append(tuple(sum(o[i] for o in options)/len(options) for i in [0,1]))
    return {'cap':cap,'scale':scale,'speciesCaps':caps,'meanActors':sum(r[0] for r in rows)/5,'meanStrikes':sum(r[1] for r in rows)/5}
def load(p):return json.loads(gzip.decompress(p.read_bytes()))
def derive(root):
    f=load(root/'frozen-source-files.json.gz');source=base64.b64decode(f['files']['src/simulation/balance.js']['base64']).decode();b=json.loads(source.split('export const BALANCE = ')[1].rsplit(';',1)[0]);prices={c['id']:c['base_harvest_value'] for c in b['crops']}
    states={a:load(root/'native-original'/a/'state.json.gz') for a in ['responsible','neglect']}
    profiles={}
    for arm,s in states.items():
        live=[p for p in s['plants'] if p['alive']];value=sum(prices[p['species']] for p in live);bands=[]
        for r in [2,3,4,5]:
            counts=[len(select(live,(p['x'],p['z']),r,8)) for p in live];bands.append({'radius':r,'countsIncludingTargetClippedTo8':{'mean':sum(counts)/len(counts),'min':min(counts),'max':max(counts)},'usableMeanByCap':{str(n):sum(min(n,c) for c in counts)/len(counts) for n in [1,2,3,4,6,8]}})
        profiles[arm]={'terminalLiving':len(live),'terminalLivingBaseValue':value,'bands':bands,'scope':'terminal spatial population only; does not establish alive-at-contact, walls, shield or ingress. Candidate filtering still required.'}
    proxy=json.loads((root.parent/'horde-threat-audit-e040ea6f/mathematical-screen.json').read_text(encoding='utf-8'))['empiricalProxies'];avg=lambda k:sum(v[k] for v in proxy)/2
    I,S,W,P,U,D=[avg(k) for k in ['dailyIncome','dailySeeds','dailyWages','averageRealizedPayout','averageSeedPayment','destroyedPerDay']];lossunit=U+.75*P;required=(I-S-W+D*lossunit+500+303)/lossunit
    env=[envelope(b['animals'],5,1,[3,2,2,2,1]),envelope(b['animals'],10,3,[8,5,4,3,2]),envelope(b['animals'],12,3,[8,5,4,3,2])]
    rows=[]
    for e,n,r,increment in itertools.product(env,[1,2,3,4,6,8],[2,3,4,5],[1,2]):
        available=sum(next(v for v in a['bands'] if v['radius']==r)['usableMeanByCap'][str(n)] for a in profiles.values())/2
        contact=e['meanStrikes']*.9*.9*.85
        # Individual shielding applied to each affected crop, not attacker once.
        kills=contact*available/(2/increment)
        net=I-S-W-max(0,kills-D)*lossunit+303
        rows.append({'cap':e['cap'],'maximumAffected':n,'radius':r,'attackHitIncrement':increment,'terminalMeanTargetsBeforeWalls':available,'potentialDailyKills':kills,'neglectNetAdverse':net,'terminalCapacityPass':net< -500})
    candidate=[]
    for cap in [10,12]:
        options=[v for v in rows if v['cap']==cap and v['terminalCapacityPass'] and v['radius']<=5 and v['maximumAffected']==8]
        if options:candidate.append(min(options,key=lambda v:(v['maximumAffected'],v['radius'],-v['attackHitIncrement'])))
    for c in candidate:
        effective=min(math.floor(pressure(v['terminalLivingBaseValue'],c['maximumAffected'])) for v in profiles.values())
        mean=sum(sum(len(select([p for p in states[a]['plants'] if p['alive']],(p['x'],p['z']),c['radius'],effective)) for p in states[a]['plants'] if p['alive'])/profiles[a]['terminalLiving'] for a in states)/2
        strikes=next(e['meanStrikes'] for e in env if e['cap']==c['cap'])
        kills=strikes*.9*.9*.85*mean/(2/c['attackHitIncrement'])
        c['curveAtTerminal']={'effectiveTargets':effective,'meanTargets':mean,'killsBeforeAdditionalOcclusion':kills,'neglectNetAdverse':I-S-W-max(0,kills-D)*lossunit+303}
        c['unverifiedGoodExposurePoint1']={'kills':kills/9,'goodNetBeforeRepair':I-S-W-max(0,kills/9-D)*lossunit-303}
    return {'scope':'Frozen original high-yield economy; terminal capacity screen, no historical contact replay/campaign','sourceSHA256':hashlib.sha256((root/'frozen-source-files.json.gz').read_bytes()).hexdigest(),'prices':prices,'fixed':{'center':800,'start':1500,'elder':30,'young':40},'profiles':profiles,'actorEnvelopes':env,'requiredNeglectKillsPerDayForNegative500':required,'centralAssumptions':{'spent':.9,'cropContact':.9,'samePerCropShield':.15,'lostHarvest':.75,'deliveryAdverseBound':303,'notVerified':True},'candidates':candidate,'allCapacityRows':rows,'cappedCurve':{'continuousPressure':'1+(Nmax-1)*V/(V+10000)','V':'sum original base payouts of living crops, no cash; freeze at raid creation','effectiveTargets':'floor continuous pressure, stable no new RNG; fullN ceiling is not achieved at finiteV','increment':'1 until declared postintro value threshold;2 above threshold. Discrete operation, not continuous damage. Threshold requires pilot review.','structuralDamage':'keep native frozen damage, optional bounded1–1.5 separately, never scale from area target count'},'requirements':['First5 introduction: original one target/increment1/two-hit survival and global20% destruction limit','Query spatial grid only once per committed impact, bounded radius5/candidates limit; cost benchmark pending','Affected crops independently check alive, radius, shield and animal-to-target nav segment; do not pass solid walls','Deterministic distance then stableID order; no new RNG','One attackId atomically records all crop hit effects and decrements actor budget once; reload idempotence contract required','Original zero structural contacts means structural scaling alone is ineffective in that observed history','Terminal geometry upper capacity is not a promised contact count; audit historical/replayed target population before selection','No crop mutation/deletion across remote farm, no shield bypass','Source-compatible candidate remains OFF until paired bounded physical/CPU pilot and parent approval']}
class Tests(unittest.TestCase):
    def test_local(self):
        p=[{'id':str(i),'alive':True,'x':i,'z':0} for i in range(8)]
        self.assertEqual(len(select(p,(0,0),2,8)),3);self.assertEqual(len(select(p,(0,0),5,2)),2)
    def test_individual_filter(self):
        p=[{'id':str(i),'alive':True,'x':i,'z':0} for i in range(4)]
        self.assertEqual([x['id'] for x in select(p,(0,0),5,8,clear=lambda a,b:b[0]<=1,protected=lambda p:p['id']=='0')],['1'])
    def test_stable(self):
        p=[{'id':i,'alive':True,'x':1,'z':0} for i in ['z','a']];self.assertEqual(select(p,(0,0),2,1)[0]['id'],'a')
    def test_curve(self):
        self.assertEqual(pressure(0,8),1);self.assertLess(pressure(10**12,8),8);self.assertLess(pressure(100,8),pressure(1000,8))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('root',type=Path,nargs='?');p.add_argument('out',type=Path,nargs='?');p.add_argument('--self-test',action='store_true');a=p.parse_args()
    if a.self_test:assert unittest.TextTestRunner().run(unittest.defaultTestLoader.loadTestsFromTestCase(Tests)).wasSuccessful()
    else:
        r=derive(a.root);a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps({'required':r['requiredNeglectKillsPerDayForNegative500'],'candidates':r['candidates'],'profiles':r['profiles']},indent=2))
