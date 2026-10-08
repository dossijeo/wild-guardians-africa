# Refinado de rutas V3 — candidato aislado

No modifica producción ni relaja pendientes, radios, fluidos o colisiones.
Parte de V2: caché propia por vista, invalidación en setState, conservación
al plantar sin retirar props. Cambia únicamente las muestras de los segmentos
de riesgo (pendiente observada >=0,46) de <=2,5 cm a <=1 cm.

## Diagnóstico del fallo de V2

Una continuación ordinaria del guardado histórico Sabana/Musgum reproduce
worker-53147. Sale de su posición inicialmente inválida en tick 1; en tick 2
entra en un punto de pendiente 0,500142, y en tick 3 vuelve a terreno válido.
El tramo aceptado de 13,18048 m pasa por una franja inválida muy estrecha.
Un barrido diagnóstico cada 1 mm en sus primeros 30 cm encuentra doce muestras
inválidas entre 5,8 y 6,9 cm desde el inicio. Esto no delimita exactamente sus
bordes ni prueba continuidad matemática. Las muestras de 25 cm y 2,5 cm no
detectan esa franja; las de 1 cm sí. El observador preserva this de las vistas
de navegación: cinco estados serializados completos coinciden con una
continuación sin envolver métodos, incluido el estado inicial.

## Resultados locales

- Cien ticks ordinarios: referencia dos entradas de terreno válido a inválido;
  V3 cero. Observación fuera de simulación, no timing; no prueba todos los
  puntos entre ticks ni todos los terrenos.
- Conector construido de 10 cm del diagnóstico anterior: A* evita el tramo,
  llega en 225 pasos de dt=0,01, todas las posiciones observadas válidas.
- Continuación de 900 ticks: los 27 trabajadores históricos inicialmente
  inválidos son transitables en tick 1 y llegan a casa como máximo en tick 684.
  Cada desplazamiento respeta la velocidad calibrada; contratación real pagada
  de 112 trabajadoras. Sin traslados ni cambios de gameplay.
- Guardado después de diez ticks, navegación nueva y fría: cuarenta pares de
  estados serializados completos coinciden con la continuación caliente.
- Tres tests de propiedad/invalidation de caché pasan; no aceptación universal
  de todas las vistas ni de todas las combinaciones de guardado.

## CPU ABBA

Cuatro continuaciones independientes de cien ticks, 25 warmup y 75 medidos.
Mismo Game; Navigation diferente. Serialización/hash fuera del timing.
Cuatro campañas CPU confirmadas vivas, ventana coordinada con el subagente
para no lanzar Blender. No benchmark GPU, renderer, teléfono o trabajo idéntico:
el candidato cambia las rutas desde el primer tick. Las referencias coinciden
entre sí y los candidatos entre sí en todos los estados serializados.

| Brazo | Mediana ms |
|---|---:|
| Referencia A | 4,4851 |
| V3 B | 3,6002 |
| V3 B | 3,6071 |
| Referencia A | 3,8509 |

Medianas combinadas: referencia 4,2536 ms; V3 3,6071 ms. No aislar el coste
del refinado ni prometer una ganancia general a partir de estos números.
Por brazo candidato: 11427 comprobaciones, 551 hits, 295 segmentos refinados,
36707 muestras finas, 103 rechazos. El hash del candidato medido coincide con
el archivado; sourceHashes.navigation identifica ahora correctamente el origen.

## Decisión

V3 supera estos casos, pero permanece exclusivamente en QA. Faltan escenarios
de riesgo en todos los biomas (especialmente Gran Cañón), diferentes dt,
segmentos de animación/desvíos entre actores, restitución de más guardados y
coste en fincas/rutas distintas. Muestrear más fino puede seguir dejando
franjas sin detectar; no sustituye una protección robusta de movimiento.
No se considera finalizada la prevención de trabajadores fuera de terreno.

Verificación de archivo: `node docs/qa/worker-route-refinement-v3/verify.mjs`.
Los artefactos gzip conservan candidatos, runners, informes y fuentes exactas;
el recibo comprueba bytes/SHA-256. Los runners usan el guardado original de
`docs/qa/intensive-sabana-musgum-e461b550/state.json.gz` y el perfil real.
Para reproducir, restituir sus rutas .cache originales, V2 del archivo anterior
y ejecutar prepare, quality, connector, restore, native return y benchmark.
