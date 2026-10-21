# Revisión global V8

36 capturas reales:6 biomas,3 cámaras,día y noche,semilla712,media,1280×720. Auditoría sin errores y con cámara,objetivo y hora coincidentes con V7. Esta revisión reúne candidatas, no mide rendimiento ni aprueba su integración por defecto.

Cambios frente a V7: LOD de viento/normales/pigmento en Sabana y Gran Río,conservando paleta y desgaste de este último; sandWear=residual en Desierto. Permanecen musgo de dos orientaciones con muestreo condicionado,ambiente nocturno volcánico,roca/ceniza y sombras del horizonte del Cañón. No incluye la candidata de profundidad aislada para transparencia de árboles.

- [Conjunto diurno normal](day-pose0-overview.webp)
- [Conjunto nocturno normal](night-pose0-overview.webp)
- [Conjunto diurno elevado](day-pose1-overview.webp)
- [Conjunto nocturno elevado](night-pose1-overview.webp)

Revisión visual de conjuntos normales:

| Bioma | Lectura actual | Trabajo pendiente |
|---|---|---|
| Sabana | Calidez,vegetación con volumen y suelo legible | Transición a grandes zonas lejanas planas; evaluación temporal fina |
| Gran Río | Cubierta continua y caminos claros | Uniformidad extensa y lectura nocturna oscura |
| Gran Cañón | Paredes cálidas,estratos y sombras amplias | Bordes de agua muy rectos; estudiar transición material sin alterar terreno autoritativo |
| Manglares | Suelo verde con relieve e islas de desgaste | Patrón repetido todavía visible; no equivale a acumulaciones orgánicas del mockup |
| Volcanes | Fracturas y contraste con lava | Noche pierde detalle y presenta zonas muy negras |
| Desierto | Ondulaciones visibles y volumen incluso entre edificios | Amplias áreas homogéneas y validación temporal del relieve |

Recomendación: conservar estas candidatas como base visual de revisión, sin declarar conseguido el objetivo global. El siguiente cambio artístico debe abordar variación mesoscópica del suelo o legibilidad nocturna, evitando prolongar ajustes minúsculos de LOD como sustituto del objetivo global. Los cambios de silueta y simulación siguen fuera del alcance.

Evidencia de costes separada: [Sabana](../grass-pigment-repeat-20261021/README.md),[Gran Río](../river-grass-lod-equivalent-20261021/performance/README.md),[Desierto](../desert-wear-relief-20261021/performance/README.md). No existe todavía benchmark global V8 ni validación completa en perfil bajo. Los costes de candidatas no deben sumarse ni extrapolarse entre biomas.

```text
node tools/experiments/capture-combined-campaign-review-v8.mjs
python tools/experiments/package-combined-campaign-review-v8.py
```

Vite5190;archivar salidas antes de repetir. No modificaciones de main ni del comportamiento predeterminado.
