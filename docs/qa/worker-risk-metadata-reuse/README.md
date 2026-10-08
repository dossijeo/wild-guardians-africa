# Reutilización QA de metadatos de riesgo — V5

Sin cambios de producción. Sobre V4, el cache de segmentos refinados guarda
{valid,peak} en lugar del booleano interno. La API testSegmentClear sigue
devolviendo booleanos. qaKnownRisk consulta exclusivamente la caché propia
del navegador/vista con clave exacta de coordenadas, radio, ignore y worker.
No reutiliza resultados de animales ni permite heredar respuestas de otra vista.

Cuando el guard reconoce el tramo hasta el waypoint completo, reutiliza su
clasificación de planning durante ese tramo; si no, conserva el barrido local
de V4. Un tramo entero puede clasificarse como riesgo por una pendiente lejana,
por lo que protege más llegadas de las estrictamente necesarias. No hay nuevas
relajaciones de terreno, velocidad, física, destino o recuperación.

## Resultado funcional y cachés

- Conector adversarial real: un rechazo, desvío y destino alcanzado en70
  pasos; todas las posiciones observadas transitables.
-100 ticks ordinarios de finca histórica: referencia dos entradas a terreno
  inválido; V5 cero.
-900 ticks:27 retornos históricos salen del terreno inválido en tick1 y llegan
  a casa como máximo en tick684; mismo estado final que V3/V4.
-40 pares de estados serializados completos iguales al guardar/cargar una
  finca real después de10 ticks.
- Rechazo específico guardado en tick7:63 pasos posteriores, llegada al
  destino, estado completo idéntico tras cargar. Trabajador construido añadido
  al snapshot; demás actores/reloj congelados, no aceptación de campaña.
- Ocho tests locales pasan: API booleana, reutilización sin nueva consulta,
  propiedad de caché en vista propuesta, invalidación de estructuras,
  conservación crop-only, claves independientes, guard de llegada,
  prioridad de cuerpos dinámicos y límite de10000 claves. Algunas de estas
  invariantes se prueban juntas; el archivo exacto conserva las ocho pruebas.

## CPU ABBA con estados idénticos

Mismo protocolo V3/V5,100 ticks por brazo,25warmup/75medidos. Referencia V3
con Game original, candidato V5 con guard. Los400 hashes de estado completos
coinciden entre todos los brazos. Serialización fuera del timing. Cuatro
campañas CPU confirmadas vivas; sin Blender en la ventana coordinada.
No se mide GPU/frametime, móvil ni neto respecto de Navigation de producción.

| Brazo | Mediana CPU ms |
|---|---:|
| V3 A |4,5118|
| V5 B |4,6758|
| V5 B |4,3063|
| V3 A |4,0380|

Combinadas:4,1959→4,5327ms, aproximadamente+8,03% (0,3368ms adicionales).
V4 tenía+44% en su ensayo independiente. Esta reducción del porcentaje
observado no es una comparación V4/V5 bajo la misma carga exacta ni una promesa
general de rendimiento; referencias iniciales y finales también varían.

Por brazo V5:357 clasificaciones,326 reutilizadas y31 barridos nuevos,
1549 llegadas protegidas, cero rechazos. V4:1043 clasificaciones y660 llegadas
en su ensayo. V5 reduce barridos, pero protege tramos completos más tiempo.
Planning mantiene11427 consultas,551hits,295 tramos refinados,36707 muestras
y103 rechazos, igual entre brazos. Hashes de navegador/Game/guard medidos
coinciden con los artefactos archivados. Referencia exacta sourceHashes.v3;
sourceHashes.navigation es producción y no la clase de referencia usada.

## Pendiente antes de promover

Mantener en QA. Refinar el alcance espacial de los datos ya calculados para
proteger solo sectores de riesgo, conservando margen suficiente. Resolver
reconstrucción de vistas tras fallos sin repetir búsquedas costosas ni compartir
cachés entre actores/vistas. Extender pruebas a fluidos, cambios de ruta/destino,
desvíos entre cuerpos, diferentes dt y partidas completas en más biomas.
Las pruebas de seis biomas de V3 no se heredan como aceptación de V5.
Una muestra coarse que no observe riesgo sigue siendo un límite del enfoque.

Verificar: `node docs/qa/worker-risk-metadata-reuse/verify.mjs`.
Artefactos gzip y recibo de bytes/SHA-256; runners con rutas .cache originales,
guardado histórico y perfil real. Reproducción requiere V3/V4 archivados antes
y prepare V5. No se publica a itch.io.
