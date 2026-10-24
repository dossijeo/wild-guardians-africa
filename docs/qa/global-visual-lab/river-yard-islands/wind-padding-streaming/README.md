# Regresos y streaming con margen de viento ampliado

36capturas reales: margen0,6/0,85, día/noche y nueve posiciones por recorrido, baja1280x720, semilla712, viento8 con tiempo visual fijo2. Ambas variantes usan claros herbáceos y tierra integrada. Desplazamientos de192unidades con dos regresos al punto inicial y cambios de origen. Se espera estabilización de chunks en cada parada.

Cámara, objetivo mundial, origen y chunks coinciden A/B. Sin erroresGL ni overflow. Cada sesión libera las tres texturas de tierra exactamente una vez. La candidata recupera387.652triángulos y8.489módulos lejanos en los índices0/4/8, día/noche; el control388.756 y8.627. El número de módulos vuelve exactamente, aunque los píxeles no son todos idénticos.

MAE de regreso diurno candidata0,008915/0,008918 sobre255, control0,008919 en ambos. Noche candidata0,00000145/0, control0/0,00000181. Residuos de render no aislados; no afirmar equivalencia RGB estricta. Las diferencias A/B incluyen el cambio intencionado de cobertura:2de18parejas exactas, máximo9.729píxeles diferentes.

Tras volver, candidata61geometrías/46texturas, estables hasta finalizar noche. Son contadores Three.js, no bytesVRAM ni prueba prolongada de fugas. La vista diurna de regreso inspeccionada conserva la cubierta y el camino sin una costura visible de chunk.

Conservar la opción0,85 para revisión. Este recorrido valida reconstrucción y regresos en baja; no demuestra fluidez en cámara continua, coste de regeneración ni comportamiento de media. No certifica los espacios entre las ocho muestras de desgaste.

[Capturas y estado](captures.json), [auditoría](summary.json), [regreso diurno](baja-combined-day-4.png). Reproducir capture-river-wind-padding-streaming.mjs y package-river-wind-padding-streaming.py, Vite5190. A=base0,6;B=combined0,85.
