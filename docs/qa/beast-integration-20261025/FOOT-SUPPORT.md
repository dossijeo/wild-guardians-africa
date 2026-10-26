# Apoyo de patas: corrección y límites

La revisión solicitada detectó dos causas de separación del suelo. La escena
añadía 0,025 m al margen de 0,022 m que ya aplica el controlador de animales.
Además, algunos vértices bajos seguían ponderados a la pierna: al flexionarla
bajaban por debajo de la suela y el controlador elevaba todo el modelo.
En la primera captura del león, el apoyo estaba entre 4,49 y 7,88 cm sobre
el terreno. Quitar solo el margen duplicado no resolvía la segunda causa.

Se elimina el margen duplicado únicamente en animales. Una reparación offline
transfiere al pie el peso de la pierna por debajo del tobillo, con transición
suave hacia los pesos originales hasta 6 cm por encima. No añade huesos ni
cálculos por frame. Se mantienen los clips, su duración, la corrección de
cabeza alta y el movimiento del resto del cuerpo.

## Verificación reproducible

- Para repetir la reparación, extraer con Git el GLB de `ead3780fa` a un
  fichero temporal y ejecutar `node tools/experiments/repair-beast-foot-weights.mjs
  <especie> <ruta-original.glb>`. La herramienta rechaza aplicar la reparación
  dos veces sobre un mismo modelo; escribe la candidata en `.codex-tmp/beast-feet/`.
- `node tools/experiments/audit-beast-foot-weights.mjs lion` (repetir cinco especies):
  comparación binaria con `ead3780fa`. Solo cambian bytes de WEIGHTS_0 y
  metadatos de procedencia. Posiciones, normales, UV, índices, imágenes,
  huesos, matrices de bind y canales de animación permanecen idénticos.
- `WG_QA_STRICT_SUPPORT=1 node tools/audit_beast_replacement.mjs lion`, con
  `WG_BEAST_QA_OUT=docs/qa/beast-integration-20261025/lion`: 129 fases por clip.
  Las cinco especies pasan; Walking conserva el apoyo local a 0,022 m.
- `node --test tests/animal-actions.test.js`: 29 pruebas, incluida regresión
  de apoyo, horizontalidad y ausencia de cruce entre centros de pies durante
  33 fases adicionales de marcha.
- `tools/experiments/capture-beast-feet.mjs`: WorldScene real, assets finales
  comprimidos, Sabana/semilla 712, día, 1280×720; 12 fases de marcha y carrera
  de frente y perfil. Resultados en `<especie>/feet-final/`, sin sustitución
  de modelo (`candidate: null`). No son benchmarks de rendimiento.

## Resultados y límites

| Especie | Desnivel máximo entre puntos de suela en marcha | Apoyo sobre terreno real, 12 fases |
|---|---:|---:|
| León | 0,038 mm | 0,80–3,53 cm |
| Búfalo | 0,180 mm | 0,94–2,79 cm |
| Hiena | 0,933 mm | 1,07–4,05 cm |
| Facóquero | 0,401 mm | 0,90–3,07 cm |
| Rinoceronte | 0,273 mm | −0,78–2,84 cm |

Datos completos: `foot-support-summary.json` y los informes de cada especie.
La medida de horizontalidad corresponde a la banda rígida inferior de la
suela, no demuestra que toda la pezuña tenga una base plana perfecta. La
captura puede sugerir flotación, especialmente en el facóquero: se contrastó
la altura con un raycast contra el suelo renderizado (13,5222387 frente a
13,5222386 de navegación en la posición examinada), marcadores de vértices y
un plano auxiliar de QA. No se incorporan esos auxiliares al juego.

No se ha añadido IK para adaptar cada pie a pendientes. Una suela horizontal
ancha puede intersectar ligeramente una ladera: se midió hasta 7,8 mm en un
extremo del rinoceronte. Tampoco estas muestras certifican ausencia de
deslizamiento en cualquier ruta o de todas las intersecciones en ataques.
No se eleva de nuevo a todos los animales para ocultar ese caso local.

La variante que bajaba incondicionalmente todo el cuerpo durante Walking se
descartó: la reparación de pesos resuelve la causa sin alterar el vuelo
intencionado de las demás acciones. Se mantiene el controlador original.
