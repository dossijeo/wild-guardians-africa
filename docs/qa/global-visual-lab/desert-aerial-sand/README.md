# Arena irregular: candidata QA con normal CC0

Se conserva como candidata visual la variante **normal-only + contorno geométrico**. Las crestas de arena ya son reconocibles desde la cámara normal sin sustituir el dorado actual. No se integra por defecto ni se aprueba el presupuesto: la validación posterior cubre streaming y primeras mediciones media/baja, pero faltan estabilidad temporal y aprobación de coste. Ver [validación actual](VALIDATION.md). El resultado aún tiene grandes zonas lisas según la rampa de iluminación; no equivale al mockup completo.

## Tres etapas verificadas

1. `qa-desert-aerial-sand.js`: mapas Diffuse y normal GL de Aerial Beach 01, escala declarada de 30 m, intensidad normal .65, atenuación por pendiente/desgaste y huella de píxel .15–.65 m. Conserva pintura cálida, roughness y rampas actuales. La aparición de normales reveló un punteado cuadriculado: **descartada esta salida**.
2. `qa-desert-aerial-sand-macro-ink.js`: el término `fwidth(N)` que detecta contornos usa la normal geométrica, mientras la iluminación usa la normal del material. La comparación elimina el punteado sin reducir las crestas. No cambia la visibilidad solar para conseguirlo. Se conserva como paso intermedio y se mide su coste.
3. `qa-desert-aerial-sand-normal-only.js`: carga solo la normal nueva y omite el muestreo Diffuse en arena. La paleta ya procede del terreno original. Frente al paso 2, diferencia RGB media de .023–.058 niveles/255 y máximo 2; la imagen conserva la estructura. **Esta es la candidata recomendada para continuar**.

La sustitución de normal usa una base tangente coherente con la proyección existente, no una amplificación del antiguo mapa de grano. No hay height map, POM ni nuevas siluetas. La receta usa mapas de [Poly Haven bajo CC0](SOURCE.md); no añade assets geométricos. No altera edificios, plantas, simulación ni reglas.

## Comparación en campaña

36 capturas, tres etapas de seis parejas cada una; semilla 712, Mapungubwe, calidad media, 1280 × 720 DPR 1, objetivo desplazado +50/+30 m hacia las dunas. Cámaras normal/elevada/baja, día 150/noche 350. El nombre histórico `settlement` del harness identifica un offset de cámara, no la región: las tres cámaras están aquí en las dunas.

- Original: [día](dunes/desierto-base-overview-day.webp), [noche](dunes/desierto-base-low-night.webp).
- Candidata final: [día](normal-only/desierto-candidate-overview-day.webp), [noche](normal-only/desierto-candidate-low-night.webp).
- Diagnóstico del contorno: [normal nueva con punteado](macro-ink/desierto-base-overview-day.webp) / [normal nueva con contorno geométrico](macro-ink/desierto-candidate-overview-day.webp).

[Auditoría](comparison.json): en las 18 parejas coinciden cámara, objetivo, semilla, hora, día, calidad, estructuras/plantas, draw calls y triángulos. Cero errores HTTP/JavaScript y `getError()` cero en las capturas. WebP lossless verificados contra RGB de los PNG. El original y la candidata final pertenecen a sesiones separadas con los mismos parámetros; no confundir las bases intermedias con el original.

## Rendimiento del paso intermedio, no del final

Intel UHD 0x9A60, ANGLE D3D11, Chrome WebGL2. Fixture real 26, calidad media, 1280 × 720. ABBA en una misma página, día/noche, 180 muestras por bloque: 1440 muestras GPU. Se cerró la ventana de revisión de Río durante la medición y se reabrió después. No se ejecutó compresión de imágenes durante el benchmark. La carga del sistema sigue siendo una limitación.

El conmutador restaura callbacks/caché, parámetros UV y fuentes de textura; cambiar solo el shader habría dejado un falso control. Las vueltas A/A2 difieren en un píxel (máximo 4) de día y dos (máximo 1) de noche. No son idénticas bit a bit. [Datos completos](paired.json).

| Fase | GPU original ms | GPU intermedia ms | CPU envío original/intermedia ms |
|---|---:|---:|---:|
| Día | 13.917 | 16.901 | 5.734 / 4.939 |
| Noche | 17.178 | 19.569 | 5.080 / 5.341 |

Valores: promedio de las medias de los dos bloques de cada variante. La deriva entre controles GPU es 1.822 ms de día y 2.837 de noche; entre bloques de candidata nocturna llega a 7.377 ms. Las medias no prueban un coste estable ni una mejora de CPU. **No aprobar rendimiento ni repetir automáticamente la misma medición esperando un resultado favorable.** El registro conserva un 404 de consola sin URL identificada; no se presenta como consola limpia.

Todos los bloques: 60 llamadas y 455343 triángulos enviados. Ninguna nueva pasada. El piloto intermedio permite dos lecturas de material hasta más distancia que el original; la candidata final utiliza una lectura normal cuando está activa, pero ese ahorro lógico no constituye una medición temporal. Aún requiere benchmark propio.

## Recursos y límites

La normal nueva tiene 1024², igual que la anterior: unos 5.33 MiB nominales RGBA8 con mipmaps. La validación posterior corrigió la sustitución de fuentes inmutables: ahora se reemplaza el objeto de textura, se actualizan sus uniformes y se libera el anterior. No añade sampler ni textura neta por diseño; ver VALIDATION.md para límites de memoria. El helper conserva cachés de assets originales y añade una imagen descargada de 2021795 bytes: no se afirma RAM constante ni se mide VRAM real. El Diffuse de 5933588 bytes se entrega para reproducir el diagnóstico, pero no se descarga en la candidata normal-only. Los tamaños/hashes constan en asset-audit.json.

El callback enlaza nuevos materiales y el horizonte; la validación posterior comprueba 0/144/288/0 m con cargas completas. No demuestra transición temporal durante movimiento continuo. Falta revisión de parpadeo con cámara móvil y de caminos ocupados. El perfil bajo tiene capturas y mediciones posteriores, sin aprobación global. Las crestas dependen aún de la rampa toon: se atenúan mucho en algunas orientaciones. El punteado detectado no era prueba de baja resolución del mapa; eliminar la dependencia del contorno respecto a la normal fina lo resolvió en la comparación controlada.

## Reproducir

Vite en 5190. Para cada etapa, establecer `WG_GRASS_STUDY` a `desert-aerial-sand`, `desert-aerial-sand-macro-ink` o `desert-aerial-sand-normal-only`, y `WG_GRASS_OUTPUT` al directorio correspondiente. Ejecutar `capture-desert-continuous-radiance.mjs`. Los controles son respectivamente original (sin `WG_GRASS_BASELINE`), `desert-aerial-sand` y `desert-aerial-sand-macro-ink`.

`node tools/experiments/benchmark-desert-aerial-sand.mjs` mide por defecto la receta intermedia contra original. No cambiar esa interpretación al leer paired.json. Los scripts escriben PNG y las copias de entrega son WebP.

Conservar la candidata final para la próxima validación; mantener defaults y main intactos. El viento 8× de Sabana/Río no recibe cambios. La calidad global de los seis biomas sigue pendiente.
