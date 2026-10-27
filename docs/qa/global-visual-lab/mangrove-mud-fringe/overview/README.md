# Avance irregular del musgo: descartar la amplitud fija

La vista general contradice la valoración provisional del primer plano: **no promover el avance fijo de 2,2 unidades**. Rompe los discos de barro, pero reduce varios parches a fragmentos y hace dominar todavía más la superficie repetitiva de musgo. No mejora suficientemente la dirección artística global.

[Vista elevada diurna](manglares-media-day-1-pair.webp) · [Cámara normal nocturna](manglares-media-night-0-pair.webp). Izquierda: mezcla barro/musgo anterior. Derecha: avance irregular fijo. Estas dos parejas se inspeccionaron visualmente para la decisión. No se ha medido la pérdida de área física: el cambio de píxeles no equivale a superficie de barro eliminada.

## Evidencia y límites

24 capturas reales, 12 parejas: calidad media/baja, cámara normal/elevada/inversa, día 150 y noche 350, semilla 712, 1280 × 720. La comprobación automática exige igualdad de cámara, objetivo, hora, draw calls y triángulos por pareja, sin errores registrados. Las 24 conversiones individuales a WebP sin pérdida se verificaron contra sus PNG; los pares publicados están reducidos a 1920 × 540 para revisión. [Registros](captures.json) · [Comparación](comparison.json).

Musgo original Moss002 y mezcla barro toon-interior en ambos lados. La candidata solo añade el desplazamiento procedural del peso de mezcla; no cambia geometría ni navegación. No hay benchmark nuevo, medición de memoria, movimiento continuo ni prueba de streaming en esta serie. Igualdad de draw calls no demuestra igualdad de coste GPU. No merece repetir benchmarks de esta intensidad al fallar la evaluación artística.

## Siguiente hipótesis

Limitar el avance por el tamaño y la distancia interior de cada parche, conservando un núcleo de barro legible. Debe derivarse de los contornos visuales ya disponibles, sin consultas nuevas a navegación ni cambios de ocupación. Antes de medir rendimiento, comparar de nuevo parches pequeños y grandes desde las tres cámaras. Sigue pendiente mejorar la estructura repetitiva del propio musgo; resolver el borde no bastará para alcanzar el mockup.

Esta decisión sustituye la recomendación provisional de conservar el inset fijo como candidata. El prototipo permanece solo para reproducir el descarte; renderer predeterminado y main intactos.

## Reproducción

Con Vite en el puerto 5190:

```powershell
node tools/experiments/capture-mangrove-mud-inset-overview.mjs
python tools/experiments/package-mangrove-mud-inset-overview.py
```

Se corrigieron las descripciones heredadas del capturador y empaquetador: este ensayo evalúa un único inset en Manglares, no tres candidatos globales ni solo anchura variable. Los valores registrados de las capturas no se modificaron.
