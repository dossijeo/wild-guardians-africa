"""Precommit deterministic new cameras; never reads a visual result."""
import hashlib,json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
seed='f021bd7c:stem-reverse-independent-v3'
biomes=['sabana','manglares','gran-rio','volcanes','gran-canon','desierto']
growths=[1,.065,.27,.53,.78,1,'bridge:.21875','bridge:.46875','bridge:.78125',.005,.865,1]
cases=[]
for i,growth in enumerate(growths):
    digest=hashlib.sha256(f'{seed}:{i}'.encode()).digest()
    # Three angular strata and one below-ground view, distributed before QA.
    azimuth=(i*137.507764+int.from_bytes(digest[:2],'little')/65536*17.5)%360
    elevation=[17.5,47.5,77.5][i%3]+digest[2]/255*5
    if i==10:elevation=-12.5+digest[2]/255*2.5
    cases.append(dict(growth=growth,clock=1+int.from_bytes(digest[3:5],'little')/65536*5.5,biome=biomes[i%6],night=[0,.5,1][(i//3)%3],elevation=elevation,azimuth=azimuth))
report=dict(status='PROSPECTIVE_INDEPENDENT_CASES_NOT_APPROVAL',profile='CULT_STEM_REVERSE_V3',seed=seed,algorithm='SHA256(seed:index), deterministic angular/elevation/time stratification; no input result files.',cases=cases,limitations=['New partial candidate; prior V1/V2/guided negatives preserved and not reused as acceptance.', 'Stop first source invalidity or candidate failure; no reroll, threshold relaxation or training from these pixels.', 'Color isolation with DoubleSide shadows; full angular/culture coverage and effective Front shadow/depth/resource/GPU gates remain.'])
(root/'docs/qa/frontside-model-pilot/crop-stem-reverse-independent-v3.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps(report))
