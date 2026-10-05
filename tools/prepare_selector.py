"""Connect the supplied new-game selector to the production engine."""
import pathlib,json
from font_styles import typography_markup
root=pathlib.Path(__file__).resolve().parents[1]
ref=root/'references/extracted/Wild_Guardians_Nueva_Partida_V2'
markup=typography_markup((ref/'markup.html').read_text(encoding='utf-8'))
markup=markup.replace('</head>','<link rel="stylesheet" href="../ui-theme.css?v=2"></head>')
markup=markup.replace('En este lab puedes combinar','Puedes combinar').replace('El inicio de la partida es simulado; no hay un juego detrás de esta pantalla.','Tu elección inicia una partida en el juego.')
nodes=''.join(f'<script type="application/json" id="{name}">{(ref/(name+".json")).read_text(encoding="utf-8")}</script>' for name in ['biomeData','cultureData'])
integration="""window.addEventListener('wildguardians:new-game',event=>{event.preventDefault();parent.postMessage({type:'wild-guardians:selector',action:'start',biome:event.detail.biome.id,culture:event.detail.culture.id},location.origin);});if(new URLSearchParams(location.search).has('embedded'))window.addEventListener('DOMContentLoaded',()=>document.querySelector('#sanctuary-back')?.remove());"""
out=root/'public/selector';out.mkdir(exist_ok=True)
native=(ref/'script-2.js').read_text(encoding='utf-8').replace(
    'Selecciona una cultura y pulsa Comenzar partida para iniciar la simulación.',
    'Selecciona una cultura y pulsa Comenzar partida.')
(out/'native.js').write_text(native,encoding='utf-8')
markup=markup.replace('</body>',nodes+'<script>'+integration+'</script><script src="/selector/native.js"></script></body>')
markup=markup.replace('<main ', '<button id="sanctuary-back" onclick="parent.postMessage({type:\'wild-guardians:selector\',action:\'back\'},location.origin)" class="text-button" style="position:fixed;top:8px;left:12px;z-index:50">← Santuario</button><main ',1)
(out/'index.html').write_text(markup,encoding='utf-8')
print('Original two-step selector connected to production start event')
