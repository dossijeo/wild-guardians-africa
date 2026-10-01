"""Register an unmodified GLB exported by the supplied native worker lab."""
import argparse,hashlib,json,pathlib,shutil,struct
root=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('profile',choices=['olderMale','olderFemale','youngMale','youngFemale'])
parser.add_argument('input',type=pathlib.Path)
args=parser.parse_args()
sources={'olderMale':'Ganadero_Mayor','olderFemale':'Amara_Mayor','youngMale':'Kofi_Joven','youngFemale':'Amara_Joven'}
data=args.input.read_bytes()
assert data[:4]==b'glTF' and struct.unpack_from('<I',data,4)[0]==2
assert struct.unpack_from('<I',data,8)[0]==len(data)
assert len(data)<100_000_000
size=struct.unpack_from('<I',data,12)[0]
doc=json.loads(data[20:20+size])
assert len(doc['animations'])==12,'Export the full native action library'
required={'Idle','Walk_Skip','Run','Wave','Dig','Plant','Water','Harvest','Carry_Crate','Alert','Hit','Fall'}
assert required=={a['name'] for a in doc['animations']}
assert doc['asset'].get('extras',{}).get('template')=='quata.character-template/1'
digest=hashlib.sha256(data).hexdigest()
target=root/'public/assets'/f'{digest}.glb'
if not target.exists():shutil.copyfile(args.input,target)
manifest=json.loads((root/'content/manifests/assets.json').read_text(encoding='utf-8'))
source=next(s for s in manifest['sources'] if s['file'].startswith('Quata_Character_Lab_'+sources[args.profile]))
animations={}
for clip in doc['animations']:
    inputs={s['input'] for s in clip['samplers']}
    duration=max(doc['accessors'][i]['max'][0] for i in inputs)
    animations[clip['name']]={'duration':duration,**clip.get('extras',{})}
record={'profile':args.profile,'url':f'/assets/{digest}.glb','sha256':digest,'bytes':len(data),
 'source':source['file'],'sourceSha256':source['sha256'],'exporterScripts':[
 {'path':p,'sha256':hashlib.sha256((root/p).read_bytes()).hexdigest()} for p in source['code']],
 'fps':30,'actions':animations,'bones':len(doc['skins'][0]['joints'])}
path=root/'public/content/worker-actions.json'
records=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
records[args.profile]=record
text=json.dumps(records,ensure_ascii=False,indent=2)
path.write_text(text,encoding='utf-8')
(root/'content/manifests/worker-actions.json').write_text(text,encoding='utf-8')
print(f"Registered {args.profile}: {len(data):,} bytes, 12 original actions, {record['bones']} bones")
