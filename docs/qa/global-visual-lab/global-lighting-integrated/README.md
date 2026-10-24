# Iluminación global integrada — opción experimental

Activación: `?visualLab=global-lighting` en el juego o en la fixture. No se activa por defecto.

- Relleno bajo sombras proyectadas en Sabana, Gran Río, Manglares y Cañón, con paleta del bioma resuelta al compilar el material.
- Volcanes incorpora la corrección de albedo [carbón volcánico](../volcanic-charcoal/README.md); Desierto conserva sus colores. No se aplica relleno a esos biomas.
- Cañón incorpora el terreno residente al pass solar existente. El flag se asigna al crear cada chunk, incluidos los que entran después.
- No se cambian navegación, simulación, balances, modelos originales ni atlas. La microvegetación de `grass-cushions` fue descartada y no se carga.

## Evidencia y límites

Build Vite correcto (403 módulos). 20 pruebas existentes de ground lighting, asset shadows y depth capture pasan. Las capturas de este directorio ejercitan la URL integrada, sin inyección del shader QA. La comparación previa de [partidas reales](../campaign-shadow-review/README.md) usa candidatos QA equivalentes: no sustituye la validación de integración y streaming.

Coste previo: [relleno ABBA BAAB](../ground-shadow-fill/PAIRED.md) y [terreno actualizado cada frame](../terrain-shadow-volume/README.md). La primera integración usaba paleta uniforme y selección por fragmento: su medición histórica está en [UNIFORM-PERFORMANCE.md](UNIFORM-PERFORMANCE.md). La versión actual resuelve bioma y paleta al crear/compilar el material; los tiempos anteriores no se presentan como medición exacta de esta revisión. Excepción de terreno: +0,641 ms GPU nocturnos en Cañón y +20 draws por actualización, frente al presupuesto original de +0,5 ms. Permanece como opción de evaluación.

Pendiente: comprobar capturas completas, continuidad de chunks/calidad, sombras fuera del volumen solar y medición de esta ruta integrada. La calidad global sigue lejos de los mockups, especialmente escala/composición del suelo, vegetación y agua. No solicitar integración en main como resultado acabado.

## Comprobación de integración y calidad

48 capturas completadas en seis biomas, sin inyectar el shader QA. Las 24 parejas coinciden en cámara/hora. Los controles Volcanes y Desierto no muestran cambios superiores a 3/255. Noche fuera de Cañón conserva el aspecto; aparecen diferencias aisladas inferiores al 0,01 % en dos vistas, por lo que no se afirma identidad binaria. Cañón cambia deliberadamente por la sombra del relieve.

`streaming.json` verifica desplazamiento de cámara 0 → 96 → 0 m en baja, media y alta. Todos los chunks nuevos de Cañón conservan castShadow: 25–26 chunks en baja/media y 49 en alta; las sombras están desactivadas por el renderer en baja. No hubo errores de shader/JS registrados, pero sí un 404 de consola de primera carga sin URL identificada. El mismo diagnóstico sin opción está en `baseline-stream/` y mantiene cero casters.

La vista desplazada muestra un borde recto del terreno. Está presente también en la referencia sin opción (comparar `stream-media-4-96.png` y `baseline-stream/stream-media-4-96.png`); no se presenta como continuidad visual resuelta. Esta fixture no valida el horizonte infinito ni rutas de navegación. Los contadores de recursos varían con carga y calidad; esta prueba no demuestra ausencia de fugas ni mide VRAM.

## Revisión de materiales y compilación

`constant-palette/` contiene 24 capturas de los seis biomas tras eliminar la selección por fragmento. Cañón, Manglares, Volcanes y Desierto coinciden exactamente con la integración previa; diferencias aisladas en Sabana/Gran Río quedan por debajo del 0,01 % de píxeles con diferencia superior a 3/255. Esta serie precede la corrección volcánica.

La integración volcánica tiene cuatro capturas adicionales en `../volcanic-charcoal/integrated/`: tres vistas sin diferencias superiores a 3/255 respecto al candidato QA y 0,00282 % en cámara de juego diurna. No se atribuye esa variación mínima a una mejora artística. El ensayo de [estratos erosionados del Cañón](../canyon-bedding/README.md) se descarta por discontinuidades triangulares y pérdida de coherencia visual.

La [medición actual](CONSTANT-PERFORMANCE.md) no aprueba el presupuesto global: Sabana suma +0,656 ms GPU diurnos y +0,742 ms nocturnos; Cañón suma +0,747 ms diurnos. Volcanes queda dentro del umbral en esta ronda. Se mantienen las limitaciones de caché y deriva descritas en el informe. La clave de programa distingue biomas para evitar reutilizar constantes incorrectas; una prueba reproduce la colisión previa y verifica su corrección. 21 pruebas pasan.

## Ampliación de agua

La opción también incorpora ahora [agua irregular con mapa de pendientes compartido](../water-integrated/README.md) en Sabana, Gran Río, Manglares y Cañón. Las capturas originales de este directorio preceden esa ampliación; la evidencia actual está en water-integrated/. Desierto y lava permanecen como controles. El coste incremental de agua se mide por separado y no cancela los límites de rendimiento del suelo/sombras documentados arriba.
