# Revisión visual de los cinco mockups

La petición del usuario prioriza el aspecto mágico antes de continuar las simulaciones. Referencias originales copiadas sin modificación en `mockups/`. La comparación definitiva de esta entrega está en [comparison-final/index.html](comparison-final/index.html): mockup a la izquierda y captura del juego a la derecha. Ninguna captura del juego ha sido retocada.

## Resultado y límites visibles

- Cultivos: emisión turquesa en el contorno geométrico de las hojas, halo selectivo, 16 partículas ascendentes y tres sprites suaves por cultivo, escalados con su altura. Mantienen geometría, especie, escala, crecimiento previo y sombras originales.
- Suelo: anillos visibles fuera del montículo, conexiones hacia beneficiarios reales y ramificaciones decorativas finas. Radio decorativo máximo de 4,25 m; el radio agrícola continúa en 2,05 m. El fixture coloca los dos vecinos diagonales a 1,4 + 1,4 m para que sean beneficiarios reales, sin falsear los anillos.
- Murallas: partículas sin halo central (el paso de las puertas queda libre), una textura vegetal compartida con espiral y hojas; bandas luminosas en los pilares y raíces sobre el terreno. Se conservan malla, textura, daño y conexiones nativas.
- HUD: marco vegetal original, oro y barra púrpura horizontal; medallón circular con placa de valor y botón Despertar en vertical. Captura horizontal adicional a 1280×592, proporción del mockup.

**No es una reproducción idéntica.** Los mockups presentan maíz de hojas más lisas y una muralla con ornamentos y zócalo que no existen en la malla original. Esta revisión adapta los efectos al arte nativo, sin sustituir modelos. El entramado de varias fuentes es más denso que la referencia de una sola. La composición del resto del HUD y el diálogo siguen las reglas responsive del juego.

## Iteraciones inspeccionadas

1. `look-v1`: emisión demasiado plana/cian y raíces gruesas. Comparación `comparison-v1`.
2. `look-v2`: menor emisión; se detectó pérdida de detalle de filamentos por distribuir la textura sobre 48 m.
3. `look-v3`: máscara concentrada en el área ocupada, anillos fuera del montículo. Comparación `comparison-v3`.
4. `look-v4`: corregida copia de framebuffer SRGB incompatible; primer halo real, todavía blanco y pixelado.
5. `look-v5`: filtro a media resolución y extracción cromática turquesa, sin iluminar el cielo blanco. Extremos de raíces más largos.
6. `look-v6`: intensidad del halo ajustada.
7. `look-v7`: contorno calculado con normales geométricas para evitar seguir el ruido del mapa de normales.
8. `look-v8`: verde más vivo y relieve superficial suavizado únicamente en plantas bendecidas.
9. `look-final`: rasterizador por distancia a segmento para reducir el pico de generación sin simplificar los caminos. Evidencia conservada: 14 PNG, `captures.json`, `performance.json` y vídeo de seis segundos `awakening-motion.webm`. HUD final en `look-hud-final`.

Las iteraciones intermedias permanecen en el checkout como diagnóstico; se adjuntan al PR las referencias y la evidencia final. No se presentan las versiones descartadas como resultado final.

## Cobertura de todas las variantes

[Galería completa](variants-final/index.html) y [láminas de inspección](variants-final/sheets.html): **70 capturas, cero errores**. Se revisaron visualmente las siete láminas: cultivos maduros de día y noche, jóvenes de noche, murallas de día y noche, dañadas y puertas abiertas. La galería incluye además el estado normal diurno de cada modelo, plantas jóvenes diurnas y puertas cerradas.

- Cultivos: mijo, girasol, sorgo, maíz, batata, algodón, yuca y plátano. Se conservan los colores de espigas, mazorcas, pétalos, algodón y frutos; la máscara de verde excluye amarillos/blancos. Jóvenes al 42 %: se comprueba también el material de transición nativo.
- Murallas: zarzas, empalizada, adobe, reforzado y piedra, incluyendo daño al 65 % de vida y puertas abiertas/cerradas. La pose dañada se verifica contra `NativeWall.visual` después de su transición nativa, no solo contra el dato de vida. El motivo se fragmenta naturalmente en las zarzas y tablones y sigue las superficies existentes; no crea paneles entre huecos.
- Fixture: una parcela nativa despejada reutilizada; destrucción/remoción de las entidades anteriores por las rutas reales. +1500 monedas de financiación QA explícita, madurez, reloj y cargas prescritos. No es prueba económica. Las capturas anteriores `variants-v1` tenían obstrucciones y halos excesivos; `variants-v2` descubrió un avance de tiempo insuficiente en el harness de daño. Se corrigieron ambos antes de la pasada final.
- Cambios derivados: halo proporcional a la altura, sin esfera en las puertas, radio decorativo menor en cultivos aislados, turquesa legible sobre suelo diurno y culling ampliado para partículas de plantas altas.

## Verificación

El harness abre el menú real, compra y coloca entidades mediante comandos nativos, después fija madurez, reloj y carga para inspección visual. No prueba economía ni progreso de campaña. Se comprueba también que el render target del halo contiene luz mediante lectura GPU: una copia vacía ya no puede pasar silenciosamente.

**107/107 pruebas dirigidas aprobadas**: `look-final-regressions.txt` (Despertares, cultivos/murallas nativas, guardados relacionados, VFX, atlas, origen, HUD y las regresiones detectadas en la suite general). Build: `look-final-build.txt`. Sintaxis: `look-final-browser-syntax.txt`. El HUD comprueba interacción con ratón/teclado, cancelación, confirmación, arrastre de cámara y ausencia de solapamientos en cuatro tamaños.

La suite general anterior terminó con 5022 aprobadas, 9 fallos y 62 omitidas (5093 total). Se corrigieron los nueve casos y se reejecutaron sus suites: crates históricos sin especie, escenas parciales sin reloj de toon, contrato del shader de recarga y auditoría SFX desactualizada. No se ha vuelto a ejecutar la suite completa tras esta revisión; no se declara toda la suite verde. La auditoría de audio mantiene 126 archivos originales, 101 asignados y 25 sin asignar; solo se actualizan hashes/referencias de código.

## Rendimiento de esta versión

Chrome/ANGLE Intel UHD D3D11, 1280×800, calidad media; 78 plantas compradas, mismo encuadre y entidades; 25 frames de calentamiento y 80 medidos por brazo. El contador conserva las tres pasadas del halo. Hay un único draw de partículas, independientemente del número de fuentes; tres draws fijos adicionales para el filtro. Sin luces de mundo nuevas. Máscara RG de 1024² = 2 MiB por chunk ocupado, tres texturas de pantalla reutilizadas (una completa y dos a media resolución). No hay reconstrucción de raíces en reposo.

| Hora | Fuentes | CPU mediana ms | GPU mediana ms | GPU p95 ms | Draws | Última reconstrucción máscara ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Día | 0 | 5.00 | 19.88 | 25.51 | 68 | 6.23 |
| Día | 1 | 5.11 | 22.99 | 29.03 | 72 | 5.98 |
| Día | 32 | 5.27 | 25.03 | 30.71 | 72 | 50.48 |
| Día | 0 | 4.82 | 21.39 | 26.45 | 68 | 5.41 |
| Noche | 0 | 4.75 | 22.68 | 26.49 | 68 | 5.41 |
| Noche | 1 | 5.02 | 25.81 | 32.15 | 72 | 5.62 |
| Noche | 32 | 4.92 | 26.53 | 30.91 | 72 | 20.84 |
| Noche | 0 | 4.94 | 22.99 | 27.70 | 68 | 6.03 |

Los brazos de cero fuentes incluyen retirada y un control final. La medición GPU tiene variación apreciable; no certifica 60 fps, móviles ni coste nulo. La regeneración de 32 fuentes baja de 202–232 ms en v7 a 21–50 ms en la versión final. Aún produce un pico; el coste GPU del halo también es material en esta GPU integrada. No se considera resuelta la validación de rendimiento del objetivo global. Una carga normal transforma solo una entidad, pero futuras modificaciones de una zona densa también deben contemplarse.

## Campañas

Tras revisar las 70 variantes se reanudó la validación de balance. El recibo `campaigns/visual-priority-interruption.json` conserva la interrupción anterior: agricultura (45 noches) y competente en desierto (53) no fueron derrotas. Esos dos brazos se reiniciaron desde la apertura nativa, en archivos `*-final.json`, porque los checkpoints interrumpidos no contienen estado reanudable. Defensa y recuperación también están en ejecución. La campaña competente de sabana completó 100 noches; los controles y la mala gestión terminaron antes en derrota. El objetivo global y el PR permanecen abiertos; este informe no concluye el balance.
