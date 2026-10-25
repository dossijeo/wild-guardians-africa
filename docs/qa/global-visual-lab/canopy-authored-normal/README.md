# Copas: recuperar normal autoral no resuelve el déficit visual

Ensayo QA posterior a `d31b8661`, **descartado para adopción**. No cambia originales, runtime, geometría, UV, texturas, paleta ni simulación. Solo modifica tres materiales en memoria desde el script QA: acacia paraguas, acacia irregular y baobab de Sabana, compartidos por sus LOD. Gran Río es control sin cambios.

## Auditoría y elección

Se volvió a inspeccionar el mockup Sabana `1-13511.jpg`. También tiene copas verdes y luminosas; por tanto, desaturarlas indiscriminadamente no sería una corrección fiel. La observación anterior sobre «copas muy verdes» no bastaba para proponer otro color. La diferencia más relevante es la separación de hojas y el volumen local que muestra la referencia, frente a masas mayores y más lisas en el juego.

El atlas original ya tiene normales. `AfricanToon` mezcla la normal geométrica con la perturbada mediante `mix(.68,.10,toonLeaf)` y después con la envolvente de copa mediante `toonLeaf*uArtShape.x`, cuyo valor en Sabana es 0,60. Para una hoja completamente seleccionada, la contribución aproximada antes de considerar las normalizaciones sucesivas es 0,10×0,40=0,04. No faltaba mapa: su efecto estaba muy atenuado deliberadamente para conservar masas legibles.

La hipótesis acotada fue recuperar parte de ese detalle existente sin modificar la envolvente. Se probó 0,48 en el término de hoja (aproximadamente 0,192 después de la segunda mezcla), manteniendo el término 0,68 del resto del material y su `normalScale=0.6`. No se añadieron ruidos, normales sintéticas, mapas ni muestras de textura. Los valores son una prueba explícita del mecanismo observado, no una recomendación general.

## Resultado visual

Las 16 capturas WebGL comparan día/noche, cámara de juego/baja y dos biomas. En Sabana se alteran algunos reflejos y pequeñas facetas, pero no aparece la estructura de hojas de la referencia. La mejora es demasiado tenue a la distancia de juego y menor todavía por la noche. No demuestra que aumentar más el factor vaya a resolverlo: podría enfatizar irregularidades del atlas o ruido antes que aportar forma útil.

**Se conserva el shader anterior.** Esta prueba descarta que un pequeño ajuste del mezclado de normales baste para cerrar la diferencia. No prueba que todo trabajo sobre normales sea inútil, ni que el atlas o la geometría sean la única causa. Una futura intervención debe aportar formas de hoja legibles y coherentes con el modelo, y validarlas a distancia normal; no se justifica otra ronda de aumento global de intensidad.

## Recursos y validación

[`mesh-audit.json`](./mesh-audit.json) registra tres materiales y las fuentes normales existentes. [`comparison.json`](./comparison.json) verifica cámaras idénticas y contadores coincidentes en cada pareja:

- Sabana, cámara de juego: 86 draws, 1.267.265 triángulos, 124 geometrías en ambos brazos.
- Gran Río, cámara de juego: 84 draws, 746.779 triángulos, 122 geometrías en ambos.
- Ningún mapa, buffer geométrico o descarga de arte adicional. La cantidad de texturas coincide por pareja (73–75 según cámara/momento de carga).
- Cambia la constante del programa shader compilado; no se midió memoria interna del programa ni VRAM total.
- Sin errores de navegador/shader en las 16 capturas. Los dos scripts pasan `node --check`.
- No se ejecutó ABBA: el cambio falla primero el criterio de ganancia visual y el host estaba reservado para una campaña de simulación. Igualdad de contadores no permite afirmar coste GPU idéntico.

No se añadió una prueba de lógica que replique esta sustitución literal reversible. No hay cambios runtime posteriores al build correcto de `dd3da8b4`.

## Reproducción

Con Vite en 5189: `node tools/experiments/capture-canopy-authored-normal.mjs`. Este script instala `qa-canopy-authored-normal.js` en la escena cargada solo para Sabana y la variante nombrada. El parámetro de URL por sí solo no activa ningún cambio en el juego. Las cámaras y horas se guardan en `captures.json`.
