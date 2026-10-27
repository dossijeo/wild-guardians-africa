# Revisión conjunta V6: seis biomas

36 capturas reales,media,seed712,1280x720,tres cámaras y día150/noche350. Cámaras/objetivo/hora coinciden exactamente con V5; cero errores registrados. Cuatro hojas resumen publicadas. Capturas fuente completas en carpetas locales regenerables mediante capture-combined-campaign-review-v6.mjs; empaquetar/verificar con package-combined-campaign-review-v6.py.

Conjunto: suelo/iluminación global, hierba continua QA Sabana/Río con viento8, suelo y patios de Río QA, musgo/barro de Manglares, arena de Desierto/Cañón, roca volcánica layered y canyonShadows=horizon integrados como opciones. Fundido suave del laboratorio activo; el filtrado aislado de una superficie sigue fuera de esta combinación mientras permanezca QA. No confundir esta revisión con equivalencia de todos los candidatos individuales integrados ni benchmark global.

| Bioma | Lectura de las capturas | Trabajo pendiente |
|---|---|---|
| Sabana | Calidez y cobertura cercana perceptibles; sombras legibles | Transición de cobertura a distancia y parcelas desnudas amplias |
| Gran Río | Cubierta densa claramente distinta del terreno desnudo | Uniformidad de grandes zonas y pérdida de lectura nocturna |
| Gran Cañón | Arena cálida y volumen de pared; emisor lejano ya disponible | Ribera todavía demasiado recta y continuidad de detalle a distancia |
| Manglares | Volumen de musgo y contraste con barro conservados | Repetición evidente de bultos con aspecto de retícula; es la siguiente prioridad de material |
| Volcanes | Fracturas y depósitos de ceniza más legibles de día | Suelo muy oscuro de noche, menor separación de capas |
| Desierto | Ondulaciones cálidas coherentes y buena lectura de edificios | Claros del asentamiento todavía lisos y muy uniformes |

Se ha vuelto a inspeccionar el mockup original de Manglares (3-13514.jpg): su cobertura es irregular y se agrupa junto a raíces/riberas; la captura real actual presenta repetición regular perceptible en primer plano. Siguiente experimento: romper repetición del material conservando su altura aparente, paleta y carácter, antes de añadir vegetación o reducir calidad. No se descarta la variante querida por coste.

Estas observaciones son valoración artística, no medición objetiva de semejanza ni prueba de FPS. Los contadores en summary.json son del último render; no incluyen necesariamente toda actualización auxiliar. Rendimiento sigue documentado por experimento. V6 no demuestra todavía calidad comparable global a los seis mockups, ni valida campaña larga, LOD temporal completo o todos los VFX. Mantener objetivo abierto y main intacta.
