# Gran Río: separar borde por distancia y por máscaras

**El borde junto al poblado no es exclusivamente un límite de distancia.** En las vistas normal y oblicua de calidad media inspeccionadas aparece una banda azul sin rojo apreciable; corresponde a altura de ancla reducida antes del desvanecimiento por distancia. Hacia los extremos sí aparece reducción por distancia. Este hallazgo cambia la prioridad de los siguientes experimentos.

[Vista normal media](gran-rio-media-day-pair.webp) · [Vista normal baja](gran-rio-baja-day-pair.webp) · [Diagnóstico oblicuo media](gran-rio-media-combined-oblique-day.webp)

Izquierda: aspecto actual con paleta candidata y desgaste. Derecha: falso color de diagnóstico, no propuesta artística.

## Leyenda y límites

- Rojo: `1-farFade`, pérdida por el rango final de 12 m.
- Azul: `1-clamp(coverageAnchor.w/.65,0,1)`, reducción de altura del ancla respecto al mínimo aleatorio sin máscaras.
- Verde: constante .12 para mantener visible la geometría sin reducción.

Se omite la curva de tono del shader de hierba, manteniendo la conversión de salida de Three. Los canales se combinan; no interpretar los colores como categorías excluyentes. El azul agrupa desgaste, cobertura y humedad: no distingue cuál domina. Las hojas completamente rechazadas por máscaras, obstáculos, agua o pendiente no aparecen y este diagnóstico no identifica su causa. La selección geométrica y el movimiento no cambian. No se alteran edificios, suelo ni otros objetos.

## Diferencia de soporte encontrada en código

La cubierta rechaza centros con desgaste mayor de .25 y huellas con desgaste máximo mayor de .27. La variante de desgaste retenida reduce además altura con `clamp((.27-edgeWear)/.17,0,1)`. El suelo, en `biome-material-source.js`, conserva una cobertura de textura `mix(.70,1.,smoothstep(.15,.64,ctx.r))*(1.-wear*.91)` para Gran Río. Por tanto, al desaparecer la geometría aún puede quedar una proporción importante del material herbáceo en el suelo. No significa que deba extenderse hierba sobre caminos: el siguiente experimento debe coordinar la transición del material con la máscara de desgaste existente, conservando áreas despejadas.

El diagnóstico visual no demuestra por sí solo que toda la discontinuidad provenga del desgaste. Sí refuta tratar toda la banda cercana al poblado como un borde de alcance. Los ensayos anteriores de color y altura siguen siendo válidos como comparaciones, pero sus interpretaciones del borde eran demasiado generales.

## Validación

12 capturas reales, 6 parejas; Gran Río semilla 712, día 150, baja/media, 1280×720, tres poses. Cámara, objetivo, hora, llamadas, triángulos, instancias y buffers coincidentes. Sin errores registrados ni overflow. Inspección de normal baja y normal/oblicua media. [Registros](captures.json), [auditoría](comparison.json).

No es una mejora de producción, ni una prueba de rendimiento. No se mide noche porque el falso color omite deliberadamente iluminación y sombras de la cubierta. No extrapolar a los otros biomas. PNG fuente locales; pares, vista oblicua y datos publicados.

## Reproducción

```powershell
node tools/experiments/capture-river-cover-boundary.mjs
python tools/experiments/package-river-cover-boundary.py
```

Vite 5190. Sin cambios predeterminados ni de simulación. El objetivo gráfico global sigue pendiente.
