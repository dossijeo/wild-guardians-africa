# Arena irregular junto al poblado

24 capturas reales, 12 parejas comparables: campaña Desierto semilla 712, Mapungubwe, calidad media/baja, día 150 y noche 350. Tres cámaras alrededor del objetivo inicial del poblado: normal, oblicua y reversa. Izquierda original, derecha candidata normal-only. No se cambian edificios, actores, geometría ni simulación.

- [Normal de día, media](media-day-game-comparison.webp)
- [Oblicua nocturna, media](media-night-oblique-comparison.webp)
- [Reversa diurna, baja](baja-day-reverse-comparison.webp)
- [Metadatos](captures.json) y [auditoría](comparison.json).

Las doce parejas coinciden en posición, objetivo, hora, draw calls y triángulos. No hay errores registrados HTTP/JS/consola ni GL. Se congela el reloj visual y se espera a chunks, horizonte y actores. Se reinicia la caché LOD QA al comenzar cada toma. Esto es revisión estática, no un benchmark ni una prueba de campaña avanzada.

La inspección directa de normal diurna y oblicua nocturna confirma un cambio perceptible: las ondulaciones dejan de verse solo en dunas aisladas y dan volumen al terreno entre edificios, manteniendo el dorado y la lectura de las fachadas. La noche conserva el detalle sin levantar globalmente la exposición. El cambio numérico de píxeles no se usa como prueba artística por sí solo.

Limitación visible: en la cámara normal diurna, el borde del camino de primer plano se vuelve más dentado y la escala de las ondas resulta bastante marcada junto al poblado. La evidencia no permite atribuir todavía ese borde exclusivamente al mapa normal: debe aislarse la interacción con desgaste/máscara e iluminación antes de promover. No se ha inspeccionado perceptualmente cada píxel de las 24 imágenes ni se certifican caminos de otros estados del mundo.

Decisión: conservar candidata QA; no integrar aún. Esta revisión cierra la falta de vistas del poblado inicial, pero abre una comprobación concreta de continuidad del borde y atenuación en zonas desgastadas. El coste acumulado en media/noche sigue pendiente según VALIDATION.md; no se repitió el benchmark para buscar una cifra favorable. Había un proceso ajeno de QA de música activo, por lo que este pase deliberadamente no aporta medidas de rendimiento.

Reproducir con Vite del worktree en 5190:

```powershell
node tools/experiments/capture-desert-sand-settlement.mjs
node tools/experiments/package-desert-sand-settlement.mjs
```

Los PNG de trabajo se regeneran. Se conservan WebP lossless individuales y comparativas WebP para revisión. El código de captura deriva del recorrido de dunas y utiliza aquí tres poses estáticas. El objetivo de calidad global de los seis biomas sigue activo y no se declara alcanzado.
