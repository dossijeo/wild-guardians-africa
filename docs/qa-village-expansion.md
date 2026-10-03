# Expansión nativa: integridad y trabajo acotado

Implementación `7ff5398`. [60 pruebas dirigidas](qa/village-expansion/directed.txt),
60 aprobadas, cero fallos/omisiones, 202049,5789 ms. Se utilizan los polígonos y
edificios reales de las cinco culturas, Navigation y SaveRepository reales,
sobre terreno plano controlado y un saldo de QA explícito. No es una prueba de
renderizado de 100 poblados ni una medición de FPS o de selección en biomas reales.

- QA-137: se confirman los ordinales 2 a 100, alternando cinco culturas. Los
  hitos 2/3/4/10/20/50/100 cuestan 50K/75K/100K/250K/500K/1,25M/2,5M.
  Las 99 órdenes suman 126225000 monedas; el saldo preparado de 200000000
  termina en 73775000. Guardar/cargar conserva el estado completo; el siguiente
  ordinal previsualiza 2525000. No se introduce un tope de poblados.
- QA-138 (parcial en el primer ensayo): una única casa inválida rechaza el conjunto completo sin
  cobrar ni persistir cambios, en cinco culturas. Falta observar el color de
  todo el fantasma en la interfaz real.
- QA-140: gastar 35 monedas en una muralla después de previsualizar un poblado
  de 50000 con ese saldo provoca rechazo al confirmar; no aparecen medias aldeas
  ni una orden cobrada. Se comprueba en cinco culturas.
- QA-141: dos conjuntos nativos contiguos con separación de 0,05 m entre sus
  envolventes se aceptan. Sus círculos agregados solapan, pero sus polígonos
  reales no: no se impone un radio mínimo entre poblados. Cinco culturas,
  cobros 50000/75000 y estado íntegro tras recargar.
- QA-142: coste, cultura, edificios y supresiones exactas aparecen una vez;
  previsualizar no cambia serialize(), guardar/cargar conserva todo y repetir
  la misma orden devuelve false. Antes, foundVillage validaba el solar ocupado
  antes de detectar el identificador ya ejecutado y lanzaba un error de solape.
  La revalidación ahora ocurre dentro de commit, antes del cobro de órdenes nuevas.

## Dos reducciones de trabajo conservadoras

La reasignación de centros ordena candidatos por distancia recta y busca rutas
reales. Solo descarta candidatos cuya cota inferior supera la mejor ruta ya
obtenida; conserva inaccesibles, desvíos y desempate por identificador. El ensayo
nativo de 100 poblados registra 99 llamadas de ruta para las 99 fundaciones.
No se conserva una medición anterior comparable: no se afirma un ahorro temporal.
Dos pruebas separadas comprueban desvíos, inaccesibilidad y desempates.

footprintsOverlap rechaza primero cajas separadas, con el margen existente de
1e-8, y mantiene el algoritmo exacto para el resto. Recalcula cajas de los vértices
actuales para admitir polígonos mutables. Se contrasta contra la implementación
anterior congelada desde `7af9993` en tests/fixtures/footprints-before-bounds.js:
280 pares de polígonos, seis distancias próximas al contacto y mutación del mismo
array. No se sustituye el polígono por un círculo.

## Validación adicional y límites

[Build](qa/village-expansion/build.txt): correcto, 4,36 s; conserva aviso de bundle
mayor de 500 kB. [Paquete web](qa/village-expansion/package.txt): 554 archivos,
379693942 bytes, 794 enlaces relativos y 20 GLB de runtime sin duplicados originales.
[Reglas del plan](qa/village-expansion/plan.txt) y
[assets comprimidos](qa/village-expansion/assets.txt) aprobados.

small-directed.txt conserva un ensayo previo de 15 casos aprobados y un caso
largo omitido expresamente, anterior a las dos optimizaciones. La evidencia final
es directed.txt con los 60 casos y ninguna omisión.

En el primer ensayo QA-139 seguía pendiente, igual que victoria/interfaz postgame y cientos de noches
sin ataques. Preparar el día 101 en una fixture no acredita esas transiciones.


## Fantasma y HUD: comprobación final sobre `3b02c36`

`184802f` añade Cambiar cultura a la confirmación y vuelve a previsualizar el
conjunto nativo en la posición existente tras cargar esa cultura. Limpiar el mundo
borra también el borrador de poblado. No vuelve al asistente de configuración.

La comprobación real encontró un fallo adicional: refreshCommandFeedback trataba
la herramienta village como una magia y consultaba un spell inexistente. Las
actualizaciones lanzaban TypeError y detenían la simulación con runtime-error.
[Consola anterior](qa/village-expansion/hud-console.json) conserva el contraejemplo.
`3b02c36` da una etiqueta explícita al poblado, unifica su cancelación desde panel y
aviso de HUD, y elimina la pausa del mundo fallido al reconstruirlo durante carga.
Preserva pausas de contratación, lectura y manuales; no reanuda el mismo mundo
fallido por su cuenta. La etiqueta ya está en el diccionario EN/ES.

### QA-138 completado

El visor tests/browser/village-preview.html llama a WorldScene.showVillagePreview,
Assets.village, polígonos de Navigation y materiales African Toon reales, con luz,
suelo plano y condiciones de invalidez controladas. No reemplaza los edificios
por cajas ni guarda partidas. En cinco culturas, exactamente una unidad inválida
produce preview.valid=false y todos los materiales del conjunto llevan #f4a198,
opacidad 0,45 y depthWrite=false. Se inspeccionaron las cinco capturas:
[Mapungubwe](qa/village-expansion/mapungubwe-invalid.png),
[Saheliana](qa/village-expansion/saheliana-invalid.png),
[Suajili](qa/village-expansion/suajili-invalid.png),
[Musgum](qa/village-expansion/musgum-invalid.png),
[Etíope](qa/village-expansion/etiope-invalid.png).
Los tamaños de conjunto son 10/10/7/10/9; se conservan todos los drawRanges.
El rechazo sin pago/persistencia ya lo acreditan los cinco ensayos de dominio.

### QA-139 completado

[Datos del visor](qa/village-expansion/preview-observations.json): cinco vistas
inválidas y cinco válidas recolocadas/giradas, estado serializado y prop conservados,
materiales verdes #d4f3c2 al recuperar validez. Un nuevo ensayo recorre veinte
previsualizaciones de culturas y posiciones, incluidas solapadas, y contrasta el
serialize completo, balance, poblados y supresiones de navegación sin cambios.
[Salida](qa/village-expansion/preview-purity.txt): un caso dirigido aprobado,
16 no seleccionados por filtro; no se ha repetido el ensayo largo de 100 poblados.

Además, tests/browser/village-game.html prepara explícitamente día 101 y saldo
200000 en el slot qa-village-ui del origen local 5180, con Sabana/Mapungubwe nativa
y centro pagado. Desde Continuar se carga el HUD real y se recorre Construir →
Fundar poblado → cinco culturas → recolocar → cancelar, conservando el mismo
mundo y sin iframe de configuración inicial. [Cinco cambios](qa/village-expansion/hud-culture-changes.json).
[Musgum en HUD](qa/village-expansion/hud-musgum-preview.png),
[recolocado](qa/village-expansion/hud-repositioned.png),
[cancelado desde aviso](qa/village-expansion/hud-cancelled.png).
El HUD conserva 200K; la exactitud monetaria y las supresiones se prueban con
serialize en dominio, no se deducen de la abreviación del HUD.

Tras corregir la etiqueta y recargar el snapshot con runtime-error, el reloj
avanza de 09:04 a 11:25 durante la inspección. No reaparece el fallo.
[Consola final con intervalo temporal](qa/village-expansion/hud-console-final.json):
cero advertencias/errores registrados en ese intervalo. El visor separado conserva
un aviso X4000 de environment4, ya conocido; no se afirma una consola global libre
de advertencias ni equivalencia visual de todas las cámaras posibles.

[21 pruebas dirigidas](qa/village-expansion/preview-directed.txt): cero fallos u
omisiones, 423,0931 ms, etiquetas, recuperación de pausas, rutas, polígonos e i18n.
[Build final](qa/village-expansion/preview-build.txt) correcto en 8,02 s;
[paquete](qa/village-expansion/preview-package.txt) con 554 archivos, 379694348 bytes,
794 enlaces relativos y 20 GLB runtime. Se conserva aviso de bundle de 500 kB.
La CI de la base `3a613e5` aprobó; las CI de estas correcciones se dispararon al push.
Victoria natural y cientos de noches postgame siguen pendientes: preparar día 101
no acredita esas transiciones.
