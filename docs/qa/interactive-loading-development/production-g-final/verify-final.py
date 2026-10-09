from pathlib import Path
import json,hashlib
base=Path(__file__).resolve().parent;raw=base/'root-native-production'
source='0f72ae167e1892634c76d793f2396e3dff6abcd3'
ci=json.loads((base/'ci-37924454133.json').read_text(encoding='utf-8'));assert ci['headSha']==source and ci['status']=='completed' and ci['conclusion']=='success'
s=json.loads((raw/'summary.json').read_text(encoding='utf-8'));assert s['source']==source and s['newReady'] and s['continueReady'] and s['cancelProgress']==4
assert s['cleanup']=={'gameHud':0,'loadingPanels':0,'mainCanvases':0,'menuFrames':1}
for name in ['new-console.json','console-final.json','isolated-console.json','integrated-volcanes-musgum-console.json']:assert json.loads((raw/name).read_text(encoding='utf-8'))==[]
p=json.loads((raw/'integrated-volcanes-musgum-final-progress.json').read_text(encoding='utf-8'));assert p['closed'] and not p['cancelled'];c=p['current'];assert c['ready'] and c['progress']==1 and c['error'] is None and c['pending']==[]
a=json.loads((raw/'integrated-volcanes-musgum-audio.json').read_text(encoding='utf-8'));assert a['loadingVoices']==[]
assert any(e.get('type')=='result' and e.get('id')=='farm_crop_interact' and e.get('emitter')=='loading:plant' and e.get('started') for e in a['events'])
poses=p['cameraPoses'];before=next(x for x in poses if x['phase']=='before-cinematic');after=next(x for x in poses if x['phase']=='cinematic-completed')
for key in ['eye','quaternion','target']:assert before[key]==after[key]
d=json.loads((raw/'isolated-disposed.json').read_text(encoding='utf-8'));assert len(d['plants'])==5 and all(x['growth']==148.5 for x in d['plants']);assert d['resources']=={'geometries':0,'textures':0,'programs':0}
result={'source':source,'ci':'3709/3709 PASS; build/package/itch/syntax/assets/audio/plan/balance SUCCESS','productionStatic':'New/Continue and early cancel4%; stable menu5s with zero main canvases','integratedDevApp':'Volcanes/Musgum New, five maize visible, plant audio accepted, ready1/pending0; exact Home camera restored; not arbitrary saved-camera persistence','integratedObservedMs':p['downloads']['observedMs'],'integratedElapsedMs':c['elapsed'],'isolatedFixture':'Five plants caught up to148.5 and renderer geometry/texture/program0; distinct from production interaction','limits':['Physical RAM/VRAM not measured','No fully-cached browser-wide claim','Integrated diagnostic download and elapsed retained, not a replacement for approved G ABBA','Save format does not persist arbitrary free-camera pose','Native final sample is not all30 biome/culture combinations'],'files':{}}
for item in sorted(base.rglob('*')):
 if item.is_file() and item.name!='final-verification.json':result['files'][str(item.relative_to(base)).replace(chr(92),'/')]={'bytes':item.stat().st_size,'sha256':hashlib.sha256(item.read_bytes()).hexdigest()}
(base/'final-verification.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8',newline='\n');print('PASS final CI/native/raw/source verification')
