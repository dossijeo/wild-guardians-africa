import json,re,pathlib
root=pathlib.Path(r'C:\Users\PC\Desktop\Wild Guardians New')
def shape(x,depth=0):
    if depth>3: return type(x).__name__
    if isinstance(x,dict): return {k:shape(v,depth+1) for k,v in list(x.items())[:12]}
    if isinstance(x,list): return {'length':len(x),'first':shape(x[0],depth+1) if x else None}
    if isinstance(x,str): return x[:100] if len(x)<300 else f'[string {len(x)} chars: {x[:30]}]'
    return x
for name in ['Bioma_Lab_V4_0_Materiales_Luz_Optimizado.html','Poblados_Lab_V5_Mapungubwe_Saheliano_Suajili_Musgum_Etiope.html','Wild_Guardians_SFX_Lab_V12_Catalogo.html','Wild_Guardians_Gameplay_A_Balafon_and_Flute_Lab_V1_OFFLINE.html','Wild_Guardians_Tipografia_Autocontenido.html','Wild_Guardians_Nueva_Partida_V2.html','Bastion_Lab_V4_1_Puerta_Reforzada_Mas_Grande.html']:
    s=(root/name).read_text(encoding='utf-8')
    for attrs,body in re.findall(r'<script\b([^>]*)>(.*?)</script>',s,re.S):
        if 'application/json' in attrs:
            print(name,attrs,json.dumps(shape(json.loads(body)),ensure_ascii=False))
