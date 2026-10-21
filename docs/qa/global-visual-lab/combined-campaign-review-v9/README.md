# Revisión global V9: seis biomas

36 capturas reales: seis biomas × tres cámaras × día/noche, semilla 712, calidad media, 1280×720. Cámara, target y hora coinciden con V8. Sin errores de página/WebGL. summary.json registra llamadas y triángulos por vista; son contadores de las capturas, no un benchmark global de CPU/GPU.

## Composición

Conserva Sabana/Gran Río con cubierta continua y LOD coherente; Gran Cañón con suelo cálido y sombras del horizonte; Desierto con relieve residual en desgaste. Cambia Manglares a musgo de dos escalas y cubierta de hojas con borde por desgaste, LOD y streaming QA; Volcanes usa volcanicNight=spectrum. La hoja variada ensayada solo en baja no se sustituye aquí en media. No incluye profundidad aislada para transparencia de árboles.

[Conjunto día](day-pose0-overview.webp), [noche](night-pose0-overview.webp), además de vistas elevadas. [Manglares frente a V8](manglares-day-versus-v8.jpg), [Volcanes nocturno frente a V8](volcanes-night-versus-v8.jpg).

## Lectura artística y prioridades

| Bioma | Resultado observado | Pendiente principal |
|---|---|---|
| Sabana | Calidez y volumen vegetal conservados; sombras legibles | Transición de cubierta a terreno distante y variación de grandes superficies |
| Gran Río | Cubierta densa y continua durante el día | Uniformidad y pérdida de detalle del suelo de noche |
| Gran Cañón | Estratos cálidos y sombras del relieve | Suelo ribereño y contacto con agua demasiado uniforme; no alterar geometría autoritativa |
| Manglares | Musgo menos repetitivo; cubierta local disponible | En el poblado domina la textura porque las exclusiones dejan pocas hojas; no confundir éxito de región seleccionada con mejora global |
| Volcanes | Espectro nocturno algo menos azul, roca algo más legible | Amplias zonas siguen muy oscuras; comprobar iluminación/material antes de más contraste |
| Desierto | Ondulación y calidez conservadas | Variación mesoscópica y grandes superficies uniformes |

Se volvió a inspeccionar el mockup de Manglares 3-13514.jpg: destaca continuidad de hojas pequeñas alrededor de caminos y raíces. La vista de poblado actual aún no consigue ese resultado. No relajar ocupación/caminos indiscriminadamente para aumentar cobertura; primero reconciliar representación del suelo y regiones elegibles. Tampoco sustituir la revisión global por seguir refinando un único módulo.

Recomendación: conservar candidatas y continuar trabajo visual, priorizando lectura nocturna en Gran Río/Volcanes y coherencia de suelo/cobertura en Manglares. No declarar alcanzado el objetivo ni fusionar. Las mediciones recientes de hojas corresponden a baja y otra región; NO extrapolarlas a esta combinación media de seis biomas. Faltan coste global, campañas con cambios, integración final y revisión de calidad completa.

## Reproducción

Vite 5190: node tools/experiments/capture-combined-campaign-review-v9.mjs; python tools/experiments/package-combined-campaign-review-v9.py. El empaquetador requiere las capturas locales V8 para antes/después. PNG completos regenerables; láminas y metadatos publicados. Sin cambios de producción, simulación, modelos originales ni main.
