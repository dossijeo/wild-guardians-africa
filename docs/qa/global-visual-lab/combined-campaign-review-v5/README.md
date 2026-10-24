# Revisión conjunta de seis biomas, pase5

36capturas actuales del renderer: media1280x720, semilla712, tres vistas y día/noche. Congelados elapsed/simElapsed2, materialTime0 y coberturaTime2/viento8. Sin erroresGL/página ni overflow. Reúne las opciones conservadas; no compara original contra candidata ni mide coste acumulado. No hay órdenes de construcción ni cultivos añadidos a estas sesiones.

Receta: global-lighting, sandRelief1, canyonSandfull y suelo cálido; mangroveSubstratefull; volcanicAshmask; GranRío riverSoil1 más paleta/coberturaC, claros herbáceos y margen0,85. Sabana coberturaC. Los ayudantes de cobertura/paleta siguen siendo QA; no es una integración completa en producto.

[Vista conjunta diurna](day-overview.webp), [nocturna](night-overview.webp), [cámaras y contadores](captures.json).

## Lectura artística y siguiente intervención

- Sabana: cubierta fina continua, sombras amplias y amarillo cálido. Persisten transiciones a textura lejana; no declarar resuelto LOD por una imagen.
- GranRío: la vegetación ocupa los claros y los caminos permanecen legibles; el tapiz distante sigue teniendo menos volumen. Conservar el avance reciente y sus límites documentados.
- Cañón: arena y paredes cálidas; la franja de agua rectilínea domina esta vista. No alterar geometría autoritativa para copiar la referencia. Falta mejorar integración material de orilla.
- Manglares: masas verdes y barro diferenciado; repetición del musgo todavía visible. Conservar variante completa apreciada por el usuario, sin degradarla por coste.
- Desierto: ondulaciones continuas y calidez conservadas; explanada de poblado muy lisa. No basta con textura detallada alrededor para declarar volumen global alcanzado.
- Volcanes: grandes áreas grises suaves y fracturas oscuras con poca separación cálida. Frente al mockup original revisado, la luz de aristas y la estructura de roca siguen siendo la diferencia más evidente. La ceniza aporta distribución, pero no resuelve esa lectura.

La lámina nocturna mantiene edificios y caminos legibles; Volcanes sigue frío/gris salvo lava. No introducir iluminación solar precalculada en la noche para corregirlo. Próximo ensayo: respuesta direccional cálida de roca volcánica bajo sol, diferenciada de ceniza, con normales y escala existentes primero. Si solo cambia el tinte sin mejorar planos, no declararlo éxito. Mantener noche, modelos y reglas.

Reproducir con node tools/experiments/capture-combined-campaign-review-v5.mjs, Vite5190. WG_REVIEW_BIOMES permite restringir una repetición; carpeta nueva para conservar evidencia. El objetivo global permanece abierto y estos mosaicos no sustituyen benchmarks ni campañas funcionales.
