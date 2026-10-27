# Revisión global V7

36 capturas reales de seis biomas, media,semilla712,1280x720,tres cámaras,día150/noche350. Cámaras/objetivos/horas idénticos a V6; sin errores. [Día normal](day-pose0-overview.webp), [noche normal](night-pose0-overview.webp), [día elevado](day-pose1-overview.webp), [noche elevada](night-pose1-overview.webp).

Respecto a V6: opción integrada volcanicNight=ambient y candidata QA de musgo con dos orientaciones y lecturas condicionales. Resto de receta conservado: hierba continua QA Sabana/Río,viento8,suelo/patios Río,arena y emisor lejano de Cañón,roca volcánica layered. Fundido suave activo; profundidad aislada sigue fuera de esta combinación. No todas las mejoras están integradas por defecto.

Las hojas de día/noche normal fueron revisadas. Manglares conserva volumen con menos filas, aunque aún hay regularidad; Volcanes conserva roca oscura con mejor separación nocturna. Sabana mantiene calidez/cobertura cercana, pero persiste el contraste entre cubierta cercana y terreno distante. Gran Río mantiene densidad, con uniformidad amplia y lectura nocturna limitada. Cañón conserva paredes cálidas y sombras, pero las riberas rectas siguen destacando. Desierto mantiene ondulaciones fuera del asentamiento y claros demasiado lisos alrededor de edificios.

Próxima prioridad artística: detalle residual de arena en los claros de Desierto, sin borrar desgaste, caminos ni contraste de ocupación. Después revisar transición de cobertura en Sabana/Río. No sustituir esas mejoras por ajustes imperceptibles ni retocar atlas de edificios.

Esto es revisión artística, no benchmark global. Contadores de captura corresponden al último render; tiempos por candidato constan en sus informes. El coste integrado nocturno sigue incierto por variabilidad; musgo conserva coste adicional y estado QA. La revisión no demuestra calidad comparable a todos los mockups ni campaña larga validada. Objetivo abierto, main intacta.

```text
node tools/experiments/capture-combined-campaign-review-v7.mjs
python tools/experiments/package-combined-campaign-review-v7.py
```

Vite5190. PNG originales locales; hojas y metadatos publicados.
