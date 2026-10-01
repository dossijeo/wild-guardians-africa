"""Package isolated native reference demos for lazy loading."""
import pathlib,json,shutil
root=pathlib.Path(__file__).resolve().parents[1]
manifest=json.loads((root/'content/manifests/assets.json').read_text(encoding='utf-8'))
selected={'crops':'Bioma_Cultivos','walls':'Bastion_Lab','destruction':'BIOMA_Destruccion','sfx':'Wild_Guardians_SFX',
 'worker-older-male':'Quata_Character_Lab_Ganadero_Mayor',
 'worker-older-female':'Quata_Character_Lab_Amara_Mayor',
 'worker-young-male':'Quata_Character_Lab_Kofi_Joven',
 'worker-young-female':'Quata_Character_Lab_Amara_Joven'}
result={}
for key,prefix in selected.items():
    source=next(s for s in manifest['sources'] if s['file'].startswith(prefix))
    folder=root/'public/library'/key;folder.mkdir(parents=True,exist_ok=True)
    result[key]={'markup':f'/library/{key}/markup.html','payloads':[],'scripts':[]}
    shutil.copyfile(root/source['markup'],folder/'markup.html')
    for payload in source['payloads']:
        data=dict(payload)
        # The crops lab decompresses assetData before parsing its GLB. Asset
        # extraction stores the decompressed resource, so restore that envelope.
        if key=='crops' and data['id']=='assetData':data['encoding']='gzip-binary'
        if 'path' in data:
            path=root/data.pop('path');shutil.copyfile(path,folder/path.name);data['path']=f'/library/{key}/{path.name}'
        result[key]['payloads'].append(data)
    for code in source['code']:
        path=root/code;shutil.copyfile(path,folder/path.name);result[key]['scripts'].append(f'/library/{key}/{path.name}')
(root/'public/library/manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'{len(selected)} isolated original libraries prepared')
