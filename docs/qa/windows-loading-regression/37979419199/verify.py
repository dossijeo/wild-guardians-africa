import json,hashlib
from pathlib import Path
root=Path(__file__).parent
read=lambda name:json.loads((root/name).read_bytes().decode('utf-8-sig'))
receipt=read('receipt.json');run=read('run.json')
assert run['headSha']==receipt['source']=='5042f9b7d62ec747a9c98c0e481bd35d96c6166e'
assert run['status']=='completed' and run['conclusion']=='success'
for file in receipt['files']:
 data=(root/file['name']).read_bytes();assert len(data)==file['bytes'];assert hashlib.sha256(data).hexdigest()==file['sha256']
fixture=read('desktop-visibility-fixture.json');snapshot=json.loads(fixture['snapshot'])
summary={'run':37979419199,'source':run['headSha'],'fixtureFileSha256':hashlib.sha256((root/'desktop-visibility-fixture.json').read_bytes()).hexdigest(),'snapshotSha256':hashlib.sha256(fixture['snapshot'].encode()).hexdigest(),'cases':{}}
for name,enabled,visibility in [('desktop-fluid-control.json',False,True),('desktop-smoke.json',True,False),('desktop-visibility.json',True,True)]:
 report=read(name);checks=report['checks'];loading=checks['productionLoading'];spans=loading['spans'];recipe=checks['loadingRecipe'];current=loading['current']
 assert report['ok'] is True and report['errors']==[]
 assert recipe['fluidDepth'] is enabled and recipe['pauseLoadingMenu'] is True
 for flag in ['animalPrefetch','sharedGroundClip','collectiveReadiness','parallelReadiness','parallelDioramaAssets']:assert recipe[flag] is False
 assert current['stageBusy']=='false' and current['overlay'] is False and current['failure'] is None
 assert spans['active']==[] and spans['programIdentityDropped']==0
 config=spans['configIdentities'][-1]['config'];assert config['biome']=='gran-canon' and config['culture']=='mapungubwe' and config['quality']=='muy_baja'
 phases={label:value['totalMs'] for label,value in spans['totals'].items() if label.startswith(('load-','warm-'))}
 result={'ok':True,'errors':[],'loadingRecipe':recipe,'config':config,'worldReadyAtPageOriginMs':checks['worldReadyAt'],'firstObservedBoundaryToWorldReadyMs':checks['worldReadyAt']-loading['transitions'][0]['at'],'productionLoadingFinalElapsedMs':loading['elapsedMs'],'phasesAwaitedMsNestedNotAdditive':phases,'rafFinal':{key:loading['rafDelivery'].get(key) for key in ['callbacks','maxIntervalMs']},'graphics':checks['worldGraphicsIdentity']}
 if visibility:
  assert str(config['seed'])=='712'
  observed=checks['visibility'];assert observed['passed'] is True and observed['hiddenStart']==observed['hiddenEnd'] and observed['hiddenMs']>=300000
  assert observed['visibleMenuPauses']==['menu'] and observed['resumedSimulatedSeconds']>0
  result['visibility']={'passed':True,'hiddenStartExactlyEqualsEnd':True,'hiddenMs':observed['hiddenMs'],'visibleMs':observed['visibleMs'],'resumedSimulatedSeconds':observed['resumedSimulatedSeconds'],'visibleMenuPauses':observed['visibleMenuPauses']}
 if enabled:
  probe=checks['fluidDepthBinding'];steps=probe['steps'];assert probe['passed'] is True and len(steps)==28
  expected={(lava,form,mode) for lava in [False,True] for form in ['plain','instanced','batched','morph','skinned','displaced'] for mode in (['disabled','inside','outside','moved'] if form=='plain' else ['inside','outside'])}
  assert {(s['lava'],s['form'],s['mode']) for s in steps}==expected
  for step in steps:
   assert step['pixels']==256 and step['mismatches']==0 and step['maxDelta']==0 and step['occupied']>0 and step['clear']>0
   assert step['occupied']+step['clear']==256
   assert step['stats'][0]['fallback']==1 and step['stats'][0]['specialized']==0 and step['stats'][1]['specialized']==1
   assert step['depth']['id'] is not None and step['fallback']['id'] is not None
   assert 'world-standard-depth-v1|painted-fluid-clip' in step['depth']['cacheKey']
   assert ('african-lava-relative-v4.1.4' if step['lava'] else 'african-water-relative-v4.1.4') in step['fallback']['cacheKey']
  for lava in [False,True]:
   plain={s['mode']:s for s in steps if s['lava']==lava and s['form']=='plain'}
   assert plain['inside']['occupied']+plain['outside']['occupied']==plain['disabled']['occupied']
   assert plain['moved']['occupied']!=plain['inside']['occupied']
  result['probe']={'passed':True,'cases':28,'mismatches':0,'maxDelta':0,'steps':steps,'scope':probe['scope'],'packingProgram':probe['packingProgram']}
 else:assert 'fluidDepthBinding' not in checks
 summary['cases'][name]=result
summary['limitations']=['Control also passed; no proof that fluid depth alone fixes previous timeouts.','Control fixture712 first, candidate random New next, candidate fixture712 last; cache/order/hardware variability prohibit causal speed claims.','worldReadyAt is page-origin time, not a loading duration; firstObservedBoundaryToWorldReady is explicitly observer boundary, not exact start command timing.','Final elapsed/RAF in fixture reports include real hidden300000ms; do not use them as load/frame metrics.','Raster proof is private16x16 offscreen actual depth via RGBA pass, not screen/GPU timing or six-biome equivalence.','Native report does not expose resource-disposal or renderer-state cleanup counters; exact ownership/restoration is source and CPU-contract evidence.','Pause-menu ON in every arm is not independently accepted.']
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'verified':True,'source':run['headSha'],'rawFiles':len(receipt['files']),'allRawOk':True,'nativeDepthCases':56,'mismatches':0,'hiddenMs':[summary['cases'][name]['visibility']['hiddenMs'] for name in ['desktop-fluid-control.json','desktop-visibility.json']]}))
