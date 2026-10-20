# Desierto/123: incursiones tardías en `main`

Reproducción del 20 de octubre de 2026, sin cambios de reglas ni de código de
simulación. Base: `origin/main` `1dcef5e70c05fac3eff796e34e40abea9ac3250a`.
El script de campaña tiene SHA-256
`fe029930fc1d3a0dd5f90a799227ba8673d84dc5bdc655ad7af7a7a2a2e6b725` y
`spatial-savanna.wasm` tiene SHA-256
`6feeea330cf5c8d0e338503e85abbb007d6803cd1727c0b425623956234ec551`.

Comandos desde la raíz del repositorio:

```sh
node tools/experiments/compare-enclosure-defense-campaigns.mjs desierto 30 123 test-results/desierto-123-current-30.json topological
node tools/experiments/compare-enclosure-defense-campaigns.mjs desierto 30 123 test-results/desierto-123-current-no-walls-30.json no-walls
```

Los resultados completos, con hash diario del estado serializado, finanzas y
evidencia de cada incursión, están en los dos archivos `.json.gz` de esta
carpeta. Ambos verifican las invariantes de la evidencia de incursiones.

| Política | Noches completadas | Resultado | Cultivos destruidos | Golpes a murallas | Noches sin contacto |
|---|---:|---|---:|---:|---:|
| Topológica | 30 | Partida en curso | 1 | 47 | 22 de 30 |
| Sin murallas | 26 | Derrota | 220 | 0 | 0 de 27 incursiones |

En la política topológica, las noches 10–25 no registran golpes ni cultivos
destruidos. La noche 26 registra 1 golpe, la 27 registra 2 y la 28 registra 5
con una muralla arruinada. Las noches 29 y 30 vuelven a terminar sin contacto.
El contraste sin murallas muestra que las incursiones sí dañan cultivos en la
misma semilla; también cambia las decisiones de gasto del jugador virtual, por
lo que no es una comparación de balance con una única variable física.

**Interpretación:** la defensa modifica de forma sustancial el resultado, pero
este replay por sí solo no certifica que cada noche sin contacto corresponda a
un recinto físicamente impenetrable. La investigación aislada de la PR #143
encontró, para su estado congelado del día 29, una cara de muralla alcanzable
sin un grupo agrícola relevante desde esa cara. Su rama y sus decisiones de
entrada son distintas de `main`; hay que verificar el vínculo físico y táctico
en la versión actual antes de transportar una corrección. No se modifica la
presión militar ni se considera automáticamente un error una defensa eficaz.

## Frontera física actual del día 29

La captura de `main` está en
`desierto-123-day29-main-pre-entry.json.gz`: día 29, tiempo 425, incursión
prevista para 426,421, 16 animales, 25 chunks residentes y SHA-256 del estado
serializado `289560007e988f3607f3ee671c4e038411ccce863ca3f57c882db626c58bc505`.
El estado anterior de la PR #143 tenía una incursión de 13 animales prevista
mucho más tarde; no es intercambiable con esta captura.

```sh
node tools/experiments/capture-native-raid-pre-entry.mjs desierto 123 29 test-results/desierto-123-day29-main-pre-entry.json.gz
node tools/experiments/probe-native-raid-pre-entry.mjs docs/qa/desert-late-raid-main-replay/desierto-123-day29-main-pre-entry.json.gz test-results/desierto-123-day29-main-entry-probe.json
```

Para reproducir también doce puntos alternativos alrededor del perímetro,
ejecutar el segundo comando con `WILD_PROBE_ALT_EXTERIOR=1`. El resultado de
esa variante está conservado en `desierto-123-day29-main-entry-probe.json`.

La selección produce una formación completa de 16 animales. Para el perfil
corporal más ancho, 43 caras de muralla están geométricamente entre la entrada
elegida y algún cultivo vivo. En 41 la posición de aproximación calculada no
es ocupable; la ruta nativa devuelve `unknown` por falta de conector de destino.
Las otras dos posiciones son ocupables, pero su ruta devuelve `blocked`.
De 120 posiciones muestreadas en torno a 24 cultivos, 65 no son ocupables y
55 son ocupables pero tienen ruta `blocked`; ninguna devuelve `found`. El
control con el estado inicial del día 1 sí encuentra 14 rutas a posiciones de
cultivo con el mismo instrumento.

De doce posiciones alternativas alrededor de la envolvente, tres tienen
posición ocupable y testigo exterior positivo. Desde ellas se probaron 170
destinos de cultivo ocupables y tampoco apareció una ruta `found`. Esto
descarta una oportunidad obvia en esos puntos, **no** todas las entradas ni
todos los puntos de ataque posibles. La prueba de caras usa una única posición
central por muralla y el muestreo de cultivos usa cinco desplazamientos; no
equivale al planificador completo de ataques. Los `unknown` se conservan como
tales y no se convierten en protección certificada. De momento no existe una
oportunidad física positiva que justifique cambiar la entrada o aumentar la
presión de esta incursión.
