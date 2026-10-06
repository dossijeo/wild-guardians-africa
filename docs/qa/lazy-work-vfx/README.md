# Índices de VFX de trabajo creados solo cuando se necesitan

`workVfxPlans` construía dos Maps de tareas y cultivos/estructuras en cada frame, incluso sin trabajadores actuando. Ahora los crea al encontrar el primer trabajador activo válido: sin tarea no necesita indexar destinos. Las reparaciones con presentación ya comprometida siguen produciendo polvo sin esos índices. Los Maps permanecen locales a cada llamada; cambios de estado, posición, tarea o sustituciones con igual longitud se ven inmediatamente.

## Evidencia

- 37 pruebas dirigidas correctas: VFX nativos de siembra/riego/cosecha/reparación, cuatro rigs originales, marcadores y cadenas físicas. Los nuevos casos cubren trabajadores viajando/cargando/huyendo/inactivos, incapacidad/caída, ausencia de tarea, reparación sin historial y destinos sustituidos. [TAP](tests.tap).
- 400 entradas controladas comparadas con el planificador exacto de `067e91a`: cuatro perfiles, cinco tipos de tarea, cuatro estados y cinco tiempos restantes. Planes iguales; no acredita cuatrocientas partidas físicas.
- Build correcto, con aviso previo de bundle grande ([log](build.log.gz)).

## Medición aislada

Guardado real histórico de Manglares/Saheliana, día 101/victoria, 12.201 entradas de cultivo. Las plantas históricas se preservan. El caso archivado contiene **cero trabajadores**, y los restantes usan un trabajador/tarea controlados para diagnóstico: no son una contratación pagada ni continuación simulada. Se verifica que ningún caso modifica su entrada.

Cada muestra contiene diez llamadas. Tres rondas de calentamiento y doce medidas, orden alternado. Las campañas congeladas PID 20608 y 36076 continuaban vivas; sin otros tests/builds propios concurrentes con la medición.

| Entrada | Antes, mediana ms | Ahora, mediana ms |
| --- | --- | --- |
| Archivo sin trabajadores | 25,15 | 0,007 |
| Trabajador caminando | 23,10 | 0,006 |
| Trabajador sin tarea válida | 24,00 | 0,010 |
| Riego activo | 27,75 | 28,05 |
| Solo polvo de reparación | 25,65 | 0,019 |

El ahorro corresponde a las llamadas que no necesitan índices; el riego activo conserva el trabajo anterior y no muestra ganancia. No convertir estos tiempos de diez llamadas en FPS ni extrapolarlos a toda la finca activa. [Muestras completas, hash del input y referencia](benchmark.json). [Hash de fuentes y evidencia](proof.json).

Reproducir: preparar el archivo privado con `node tools/prepare_late_farm_render.mjs`, después `node tools/benchmark_work_vfx_indexes.mjs`. El script admite otro guardado gzip como argumento; requiere la referencia Git indicada y compara solo este módulo, con las dependencias locales vigentes.

## Pendiente y prueba de visibilidad

No se ha medido el fotograma completo, GPU/RAM, audio ni móvil. Permanece pendiente el rendimiento sostenido con muchos trabajadores actuando y la aceptación completa.

También se intentó cubrir QA-014 mediante dos pestañas del navegador integrado: ambas exponían `document.hidden=false`, sin evento de ocultación en la primera. Se cerraron sin iniciar una supuesta espera de cinco minutos. Este entorno no acreditó ocultación web real; la prueba sigue pendiente y no se sustituye por cambiar una propiedad o disparar eventos artificiales.
