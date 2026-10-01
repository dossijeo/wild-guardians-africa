"""Extract original HUD artwork, layout and hiring frame without its demo world."""
import pathlib,re,json
root=pathlib.Path(__file__).resolve().parents[1]
ref=root/'references/extracted/Wild_Guardians_HUD_Lab_Contratacion_Diaria'
markup=(ref/'markup.html').read_text(encoding='utf-8')
code=(ref/'script-3.js').read_text(encoding='utf-8')
assets=(ref/'script-0.js').read_text(encoding='utf-8').strip()
css=re.search(r'<style>([\s\S]*?)</style>',markup)[1]
(root/'public/content/hud.css').write_text(css,encoding='utf-8')
hud=re.search(r'<div id="hud">([\s\S]*?)</nav></div>',markup)[0]
hud=hud.replace('14:35','07:05').replace('1.240','1.000').replace('Día 17','Día 1')
hire=code[code.index('function hiringMarkup(){'):code.index('function updateHiringTotals(){')]
hire=hire.replace('function hiringMarkup(){','export function hiringMarkup(state){')
hire=hire.replace('Empiezas con una de cada perfil.','Ajusta la selección a tu presupuesto.')
hire=re.sub(r'<p>En esta simulación[\s\S]*?</p>','<p>Los trabajadores atienden las tareas de su centro. La cosecha se cobra al entregar cada caja.</p>',hire)
hire=re.sub(r'<p>Valores de prueba configurables:[\s\S]*?</p>','',hire)
layout=code[code.index('function layout(){'):code.index('function framePaint(){')]
layout=layout.replace('function layout(){','export function layoutHud(stage){const $=id=>stage.querySelector("#"+id);')
layout=layout[:layout.index(' if(gfx)')]+' return dims; }\n'
frame=code[code.index('function framePaint(){'):code.index('function placeModal(){')]
frame=frame.replace('function framePaint(){','export function framePaint(host,dims,A){')
output=assets+'\nexport {ASSETS};\nexport const hudMarkup='+json.dumps(hud,ensure_ascii=False)+';\n'
output+='const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));let dims;\n'
output+="const HIRING_RULES={dawnMinute:425,maxPerType:Number.MAX_SAFE_INTEGER};\nconst fmt=n=>n.toLocaleString('es-ES');const hhmm=n=>`${String(Math.floor(n/60)%24).padStart(2,'0')}:${String(Math.floor(n%60)).padStart(2,'0')}`;const image=id=>`<img src=\"${ASSETS[id].src}\" alt=\"\">`;\n"
output+="const NPC_TYPES=[['youngMale','young_man','Hombre joven',true,true],['youngFemale','young_woman','Mujer joven',true,false],['olderMale','older_man','Hombre mayor',false,true],['olderFemale','older_woman','Mujer mayor',false,false]].map(([id,key,name,young,male])=>({id,key,name,young,male,wage:young?120:100,speed:young?1.5:1,shiftMinutes:male?600:720,start:425,end:male?1025:1145}));export {NPC_TYPES};\n"
output+=hire+layout+frame
(root/'src/ui/native-hud.js').write_text(output,encoding='utf-8')
print('Original HUD, responsive layout, portraits and nine-piece hiring frame prepared')
