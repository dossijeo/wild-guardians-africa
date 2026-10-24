# Manglares: viento con LOD aprobado

Ambas variantes conservan frondas nativas cercanas y compuesto preiluminado lejano con sombra precalculada, seleccionado por tamano proyectado 64 px (60/68 de histeresis). Fuerza de viento .25 frente a 0; sin viento se elimina tambien la dependencia temporal de la cache de sombras. No se retira vegetacion ni capacidad de proyectar sombra.

## Metodo

Intel UHD / ANGLE D3D11, 1280x720, calidad media, semilla 712 y fixture poblada guardada. ABAB por camara fija/movil, dia/noche; 60 fotogramas de calentamiento y 90 muestras GPU, seguidas de 90 muestras independientes de cadencia. 1440 consultas GPU validas en total. Simulacion pausada: estas cifras NO representan una partida activa. Misma camara, instancias cercanas/lejanas por muestra, trabajadores, tiempo, chunks, origen y objetivo entre variantes. Sin errores WebGL/pagina ni overflow. Recursos iguales dentro de cada escenario.

## Resultados

|Camara|Variante|Fase|GPU ms|CPU render ms|Intervalo ms|p95 ms|Actualizaciones sombra*|
|---|---|---|---:|---:|---:|---:|---:|
|moving|wind|day|21.934|9.707|31.079|39.2|304|
|moving|wind|night|23.253|8.128|27.646|36.3|304|
|moving|still|day|21.836|8.069|27.111|36.9|302|
|moving|still|night|24.21|7.914|28.529|36.3|302|
|moving|wind|day|21.559|7.613|26.761|34.4|304|
|moving|wind|night|22.541|7.551|30.03|37|305|
|moving|still|day|22.019|7.687|27.783|34|303|
|moving|still|night|21.762|8.576|30.388|36.4|303|
|fixed|wind|day|25.102|7.684|26.834|32.5|301|
|fixed|wind|night|24.283|8.517|28.709|32.9|301|
|fixed|still|day|20.178|5.811|21.703|25.2|0|
|fixed|still|night|20.07|5.62|21.568|25.7|0|
|fixed|wind|day|22.562|8.267|28.689|38.6|301|
|fixed|wind|night|23.546|6.987|25.304|30.4|301|
|fixed|still|day|19.695|5.832|21.516|24.2|0|
|fixed|still|night|20.655|5.953|23.998|28.6|0|

*Contador acumulado durante calentamientos y ambas mediciones, no draw calls por fotograma.

Con camara fija, todas las parejas mejoran: ahorro GPU 2.87–4.92 ms (aproximadamente 12–20%). La cache pasa de 301 actualizaciones a cero durante la medicion: se conserva el mapa ya generado. Los triangulos totales por frame bajan de 896336 a 406103 de dia y de 898672 a 408439 de noche, exclusivamente por evitar redibujar la pasada de sombras; la poblacion visible y LOD se verifican identicos. Cadencia y CPU tambien mejoran, con distinta magnitud entre repeticiones.

Con camara movil no hay ahorro GPU consistente (diferencias de −0.78 a +0.96 ms al quitar viento). La carga es identica: 867749 triangulos y 123.278 llamadas medios; siguen ocurriendo 302–305 actualizaciones de sombra. Esto no demuestra que el coste del viento sea cero, sino que detenerlo no resuelve la carga bajo movimiento.

Revisadas capturas diurnas de la pareja movil y nocturnas de la pareja fija: masa, iluminacion y sombras se conservan; cambia la pose de las hojas. No se afirma identidad pixel a pixel ni se ha revisado video nuevo.

## Decision y siguiente prioridad

El LOD queda aprobado artisticamente por el usuario; su integracion nativa y ciclo de recursos siguen pendientes. No eliminar globalmente el viento solo con esta prueba. Su beneficio depende de poder reutilizar las sombras; la camara movil y la escena activa requieren atribucion adicional.

Por instruccion posterior del usuario, priorizar atribucion por subsistema/pasada en escena activa: CPU de preparacion/envio, sombras completas, vegetacion y cobertura de pixeles, y suelo. Usar controles de aislamiento para separar coste marginal de coste total. No presentar quitar un subsistema como optimizacion visualmente equivalente. No asumir overdraw medido a partir de triangulos. Terminar el LOD aprobado sin seguir reduciendo unilateralmente la riqueza artistica.

## Reproduccion

```powershell
node tools/experiments/measure-fern-lod-wind-20261023.mjs
$env:WG_WIND_CAMERA='fixed'
node tools/experiments/measure-fern-lod-wind-20261023.mjs
python tools/experiments/audit-fern-lod-wind-20261023.py docs/qa/global-visual-lab/fern-lod-wind-moving-cost-20261023
python tools/experiments/audit-fern-lod-wind-20261023.py docs/qa/global-visual-lab/fern-lod-wind-fixed-cost-20261023
```

Las capturas y datos completos se encuentran en los dos directorios hermanos indicados. El codigo del renderer nativo no se ha modificado en esta prueba.
