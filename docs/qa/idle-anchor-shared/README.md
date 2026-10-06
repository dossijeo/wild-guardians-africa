# Subconjunto vivo compartido para el paseo de trabajadores

Corrección de la optimización de `8f94ef4`: su selector de dos pasadas mejoraba las fincas vivas, pero el diagnóstico adicional de fincas completamente recogidas mostró regresiones del 4–23 %. Una búsqueda previa por llamada también se rechazó por regresiones del 25–27 %. Se conservan los resultados en `rejected-two-pass.json` y `rejected-precheck.json`; no se presentan como código aceptado.

La versión actual crea el subconjunto de plantas vivas **una sola vez y de forma perezosa por actualización de trabajadores**, cuando el primero necesita un paseo. Los demás trabajadores lo reutilizan durante esa llamada síncrona. No se conserva entre ticks, ataques, comandos o cargas. Si el centro no tiene vivos, se usa la búsqueda histórica original para seguir paseando alrededor del área cultivada.

Las referencias mantienen los cambios de `alive` producidos por trabajadores anteriores. Antes de elegir el subconjunto se comprueba que aún contiene vivos del centro consultado. La fase de trabajadores puede recoger plantas; no crea ni revive cultivos. El primer riego solo inicia el crecimiento de una planta que ya está viva. Las consultas independientes a `idleFarmAnchor` sin el subconjunto conservan el algoritmo original; el ahorro se realiza en la fase integrada.

## Medición

Referencia `726157f`. Tres snapshots reales archivados con 12.201/13.541/20.443 cultivos históricos y 215/557/546 vivos. Cien posiciones diagnósticas tomadas de plantas originalmente vivas, no una plantilla real contratada. Diez calentamientos y diez pares medidos, alternando el orden. La creación del subconjunto se incluye una vez por lote; preparación, comparación e IO se excluyen. Anclas completas iguales, entrada sin cambios.

El caso sin vivos es **sintético**: marca `alive=false` en todas las plantas de una copia en memoria, no simula una cosecha ni genera un guardado válido. No se guarda esa copia como partida ni se cambia ningún archivo de entrada original. Los hashes de la entrada original y del estado diagnóstico se registran por separado.

| Caso | Mediana de cien consultas, referencia → actual (ms) | Pares más rápidos |
|---|---|---|
| Cultivos vivos: intensive-mangrove-shield-100 | 157.33 → 3.34 | 10/10 |
| Cultivos vivos: intensive-river-rejoin-100 | 189.70 → 7.89 | 10/10 |
| Cultivos vivos: crop-lifecycle-eight-100 | 250.85 → 7.69 | 10/10 |
| Diagnóstico sin vivos: intensive-mangrove-shield-100 | 163.42 → 159.63 | 4/10 |
| Diagnóstico sin vivos: intensive-river-rejoin-100 | 193.57 → 196.35 | 2/10 |
| Diagnóstico sin vivos: crop-lifecycle-eight-100 | 241.39 → 256.20 | 2/10 |

La mejora con vivos es del 96–98 % en estos lotes de cien consultas. Sin vivos la mediana va de −2,3 % a +6,1 %; conserva variación y **no acredita ahorro ni igualdad de tiempo exacta**. El resultado es mucho menor que los candidatos rechazados, pero no elimina toda diferencia. Son tiempos del selector más preparación compartida, no `Game.tick`, FPS, GPU, RAM, teléfono o campañas económicas. Las campañas 20608/36076 siguieron activas; no se ejecutaron suites/builds propios durante la medición.

## Pruebas y límites

85 pruebas dirigidas correctas. Se verifica también que una cosecha posterior a crear el subconjunto produce el ancla histórica correcta, incluso con plantas vivas de otro centro. Los casos existentes cubren empates por ID, todos los perfiles, paseo local, rutas y cadena física de riego/recogida/entrega.

La comparación nativa con `726157f` conserva exactamente el estado completo de 15.600 pasos en seis biomas (600 pasos de incursión y 2.000 diurnos por bioma), así como los contadores de navegación y riego físico inicial. Compilación Vite correcta, con el aviso previo de bundle grande. No es aceptación del render, móvil, memoria o cien noches actuales.

Reproducción: `node tools/benchmark_idle_farm_anchor.mjs <fuente-726157f> <salida.json>`; para el diagnóstico, añadir `all-harvested`. La medida final incluye la preparación compartida que no tenía el primer candidato. No comparar ejecuciones de sesiones distintas como si fueran una misma serie pareada.
