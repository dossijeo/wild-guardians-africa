import json,sys
from pathlib import Path
from PIL import Image,ImageDraw

root=Path('docs/qa/global-visual-lab')
sources={'desierto':'desert-populated-frozen-20261022','gran-canon':'gran-canon-populated-native-camera-20261022'}
for biome in sys.argv[1:]:
    old=root/sources.get(biome,f'{biome}-populated-frozen-20261022')
    new=root/f'{biome}-aligned-review-20261022'
    a=json.loads((old/'captures.json').read_text(encoding='utf-8'))
    b=json.loads((new/'captures.json').read_text(encoding='utf-8'))
    fixture=json.loads(Path(b['fixture']['path']).read_text(encoding='utf-8'))
    saved=json.loads(fixture['timing']['navigationContext']['state'])
    old_records={(r['variant'],r['phase']):r for r in a['records'] if r['quality']=='media'}
    rows=[]
    assert len(b['records'])==4
    for r in b['records']:
        assert not r['errors'] and r['quality']=='media'
        previous=old_records[r['variant'],r['phase']]
        assert r['query']==previous['query']
        for x,y in zip(previous['frames'],r['frames']):
            for key in ['camera','target','time','origin','elapsed','workers']:
                assert x[key]==y[key], (biome,r['variant'],r['phase'],y['i'],key)
            assert not y['glError']
            assert abs(y['elapsed']-saved['elapsed'])<1e-8
            assert y['workers']==[{key:w[key] for key in ['id','x','z']} for w in saved['workers']]
            assert y['farBackground']['enabled'] and y['farBackground']['mountainsVisible']
            coverage=y.get('coverage')
            if coverage:
                assert not coverage['stats']['overflow']
                for key in ['distribution','leafShape','near','far','leaves','triangles','moduleSpacing']:
                    if key in coverage: assert coverage[key]==x['coverage'][key],(biome,key)
            rows.append(dict(variant=r['variant'],phase=r['phase'],view=y['i'],
                beforeCalls=x['calls'],afterCalls=y['calls'],beforeTriangles=x['triangles'],afterTriangles=y['triangles'],coveragePreserved=bool(coverage)))
            if r['variant']=='native':
                sub=f"{biome}-media-native-{r['phase']}/{y['i']:04}.png"
                pair=Image.new('RGB',(1280,384))
                pair.paste(Image.open(old/sub).convert('RGB').resize((640,360)),(0,24))
                pair.paste(Image.open(new/sub).convert('RGB').resize((640,360)),(640,24))
                draw=ImageDraw.Draw(pair);draw.text((8,6),'Before alignment',fill='white');draw.text((648,6),'Aligned startup',fill='white')
                pair.save(new/f"pair-{r['phase']}-{y['i']}.jpg",quality=95)
    assert len(rows)==12
    (new/'comparison.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(biome,'12 matched state/pose frames; full backgrounds; coverage preserved')
