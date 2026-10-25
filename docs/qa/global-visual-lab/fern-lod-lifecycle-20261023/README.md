# LOD nativo: cambios de calidad y streaming

Sobre6e0cd930c, Intel UHD/ANGLE,1280x720 inicial, fixture712 pausada. Dos ciclos media/baja/muy_baja/alta/media por fase, camara cenital38m y dos recorridos de96m de ida y vuelta a camara normal por fase. Se llama qualitySetting real y syncChunks original; no interceptacion de materiales ni seleccion de instancias. La resolucion puede cambiar segun calidad como en el juego.

Dia y noche terminaron sin errores GL/pagina, overflow ni desincronizacion de visibilidad/conteo entre sombra auxiliar y LOD lejano. Muy baja oculta cobertura; baja usa cero frondas cercanas. Cada regreso recupera1180 instancias cercanas y701 lejanas. Simulacion permanece pausada; no benchmark de FPS.

Recursos en puntos de inicio/regreso:

|Fase|Inicio0|Regreso0|Inicio1|Regreso1|
|---|---|---|---|---|
|Dia (geometrias/texturas)|280/134|226/129|222/129|229/131|
|Noche|222/129|226/129|222/129|226/129|

No hay crecimiento monotono observado; el segundo ciclo nocturno repite los conteos. El pequeno residuo diurno y recursos de streaming impiden afirmar ausencia absoluta de fugas. Son conteos del renderer, no bytes VRAM. Los endpoints esperan chunks/horizonte y40 frames; los puntos intermedios pueden tener carga pendiente. Este recorrido por pasos valida ida/vuelta y propiedad de recursos, no garantiza fluidez de movimiento continuo ni latencia de streaming.

Revisadas las capturas completas day-media-44 y night-baja-41: cobertura continua conservada desde cenital, sin desaparicion de matas. Se guardan seis capturas de calidad media/baja dia/noche. El LOD lejano mantiene sus limitaciones aceptadas de iluminacion precalculada y transicion discreta. Las sombras solares de objetos desaparecen en baja segun el perfil nativo; no es regresion del LOD.

Reproducir: node tools/experiments/validate-fern-lod-lifecycle-20261023.mjs con Vite5190. audit.json incluye camaras, chunks, conteos y errores por observacion. summary.json resume el recorrido. Siguiente foco: invalidaciones costosas de sombras/profundidad y cierre de regresiones generales, manteniendo la cobertura aprobada.
