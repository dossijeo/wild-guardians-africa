# Revisión global V10

36 capturas reales, seis biomas, tres cámaras,día/noche,semilla712,media,1280×720. V9 con ambiente nocturno fuerte de la cubierta de Gran Río. Mantiene las hojas media de Manglares y demás candidatas previas; no sustituye por experimentos exclusivos de baja ni cambia producción por defecto.

33 imágenes exactamente iguales a V9. Solo cambian las tres nocturnas de Gran Río. Cámaras,objetivos yhoras idénticos,sin errores. pixel-audit.json contiene diferencias como comprobación de alcance,no puntuación artística. [Vista diurna](day-pose0-overview.webp) y [nocturna](night-pose0-overview.webp).

Recomendación: conservar V10 como combinación QA. Gran Río gana lectura nocturna sin alterar su identidad. ABBA específico documentado en ../river-night-cost-20261021/README.md:GPU nocturna16.64/16.69ms,sin penalización clara; no extrapolar a coste global de los seis biomas. Capturas de distancia,baja,crepúsculo yrecorrido asentado disponibles; no certificación exhaustiva de movimiento.

Prioridad siguiente: Manglares conserva extensiones de suelo predominantemente plano y contraste fuerte entre parches de musgo/tierra. Diagnosticar coherencia espacial entre material y máscara de cubierta, manteniendo exclusiones de caminos,agua yocupación. Sabana y Gran Río aún muestran textura plana a distancia; Volcanes sigue oscuro de noche; Gran Cañón conserva ribera geométricamente uniforme; Desierto tiene grandes superficies uniformes. No declarar alcanzada la dirección global de los mockups.

Reproducir capture-combined-campaign-review-v10.mjs y package-combined-campaign-review-v10.py con Vite5190. PNG regenerables; láminas ymetadata publicadas. Sin modificaciones de simulación,navegación o siluetas.
