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

V3 supera estos casos locales, pero la ampliación descrita debajo encuentra
un fallo nativo: **se descarta como solución preventiva por sí sola**. Faltan escenarios
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

## Ampliación y fallo adversarial nativo

Cinco continuaciones de cien ticks cada una en el mismo guardado histórico,
dt=0,01 / 0,025 / 0,05 / 0,25 / 0,5, no observan entradas de válido a inválido.
Representan distinta duración simulada; no son un benchmark ni trabajo igual.

La pasada inicial de seis biomas buscaba pendientes >=0,46 en [-80,80] y no
encontró casos para cuatro biomas. Se conserva como evidencia insuficiente,
no como aprobación. Su texto de scope heredado menciona terrainSite, pero
newGame no pobló edificios y setState dejó terrainSite ausente: esa etiqueta
no acredita que se probase una plataforma de poblado real.

La pasada final utiliza posiciones de hash determinista en [-160,160],
seed712, terreno y props reales, 32 conectores originalmente aceptados por
bioma. Manglares usa conectores ordinarios de baja pendiente, porque la
búsqueda inicial no encontró puntos de riesgo. Otros cinco biomas parten de
uno a tres puntos de riesgo: muchos conectores comparten origen, no son
32 regiones independientes. Cuatro dt por brazo (0,01/0,1/0,25/0,5), 1536
recorridos construidos en total, sin posiciones inválidas observadas.
Edificios no poblados, sin finca, salarios, tareas o multitudes; no aceptación
de campaña ni pruebas de caminos alternativos, porque todos los candidatos
de esta muestra aceptaron sus conectores.

Un barrido dirigido sobre el terreno histórico real, cerca del problema ya
observado, cambia esta decisión favorable local: el candidato acepta el tramo
(112,7455;9,867) → (112,8455;9,867). Sus once muestras de terreno cada 1 cm
son válidas. Un trabajador construido con estado walking, navegación/path
ordinarios y dt=0,01 entra en (112,7959;9,867) tras siete pasos: pendiente
máxima 0,50002473756, superior al límite 0,5. No se modificó el terreno ni se
forzó la ruta; nav.path devuelve directamente el destino aceptado.
Se probaron 1092 segmentos y el primero aceptado reproduce el fallo.

No basta con seguir reduciendo la separación de las muestras. Próximo trabajo:
protección de avance en segmentos de riesgo y replanning que no deje al
trabajador detenido frente al mismo tramo. El guard universal previo evitaba
el fallo pero bloqueaba el recorrido y tenía coste mayor: tampoco se acepta.
Conservar recuperación de retornos marginales, restricciones, velocidad,
destino, guardado y propiedad/invalidation de caché. Ningún cambio de runtime
se integra con este archivo de resultados negativos.
