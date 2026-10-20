# Control de rugosidad del barro

Control diagnóstico, no variante elegida. Solo cambia la rugosidad del interior de la mezcla física: de max(0,30, mapaG×0,52) a mix(0,78,0,95,mapaG). Conserva color, normales, AO y frontera. Los destellos se reducen, pero la apariencia clara del interior permanece. Por tanto, corregir rugosidad por sí sola no recupera la identidad del barro estilizado original.

24 capturas reales, media/baja, tres cámaras y día/noche, doce parejas con cámara/hora/draws/triángulos iguales y sin errores. [Datos](captures.json), [comparación](comparison.json), [normal día](media-day-game-comparison.webp), [oblicua día](media-day-oblique-comparison.webp).

No hay benchmark GPU nuevo. Se conserva como control para distinguir brillo especular de cambio de respuesta de iluminación. La siguiente variante [conserva la respuesta toon interior](../mangrove-mud-moss-toon-interior/README.md).

Reproducción: WG_SAND_STUDY=mangrove-mud-moss-matte, WG_SAND_OUTPUT=docs/qa/global-visual-lab/mangrove-mud-moss-matte, `node tools/experiments/capture-mangrove-mud-moss-blend.mjs`; empaquetar con `node tools/experiments/package-desert-sand-settlement.mjs` y mismo output.
