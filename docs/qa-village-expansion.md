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
- QA-138 (parcial): una única casa inválida rechaza el conjunto completo sin
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

QA-139 sigue pendiente, igual que victoria/interfaz postgame y cientos de noches
sin ataques. Preparar el día 101 en una fixture no acredita esas transiciones.
