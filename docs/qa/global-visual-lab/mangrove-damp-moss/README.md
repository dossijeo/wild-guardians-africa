# Musgo húmedo mediante máscara existente — no adoptar

Fuente bc06da069. Se revisó el mockup original de Manglares y el diseño aprobado de Moss002 puro con Ground050 independiente. El ensayo conserva mapas, escala y coordenadas; no mezcla barro ni añade geometría. No modifica el comportamiento por defecto.

## Hipótesis

La ruta `uGroundPureMoss` retorna antes de usar la máscara contextual. El parche añade una lectura de humedad del canal B de `uGroundMask`, selecciona .94–.995, reduce el color hasta .86 y mezcla rugosidad hacia .38. La variable wet también se asigna, pero en la iluminación continua mapeada el efecto visible procede de color/rugosidad: wet no es una simulación de agua o volumen.

## Resultado

**No adoptar.** Las imágenes no muestran una estructura de humedad o volumen reconocible a escala de juego. Cambian 1.864/1.821 píxeles de 921.600 en vista normal día/noche y 572/545 en cercana. La diferencia media por canal es menor de .011 niveles sobre255. Una diferencia medible no equivale a mejora artística. No aumentar brillo/oscurecimiento para forzarla.

[Original normal](mangrove-global-lighting-game-day.webp) / [candidato](mangrove-mangrove-damp-moss-game-day.webp), [cercana nocturna](mangrove-mangrove-damp-moss-low-night.webp).

El [audit de humedad](moisture-audit.json) encuentra 1.964 de 30.625 texels residentes por encima de .94 (6,41%), mínimo138 y máximo255. Incluye zonas ocultas y bajo agua, por lo que no es el porcentaje de suelo visible. Confirma que la selección es estrecha; no prueba que el mapa sea incorrecto o que toda representación húmeda sea inviable. La máscara existente no proporciona por sí sola la estructura visual de masas que falta en la referencia.

## Validación y coste

Ocho capturas WorldScene real, fixture11, semilla712, media, 1280×720, dos vistas y día/noche. Cuatro pares con cámara/objetivo/hora, calls y triángulos iguales; glError0. Los controles base registran un 404 de consola sin URL identificada; candidatos sin errores registrados. No se afirma consola limpia en toda la prueba. [Datos](captures.json), [comparación](comparison.json).

No nuevos recursos geométricos ni texturas. Una lectura lógica adicional de máscara por fragmento de musgo (ruta original: color, normal, ARH; candidata añade máscara). No se midieron GPU/CPU ni VRAM para un resultado visual rechazado y con inestabilidad temporal previamente documentada. No declarar coste gratuito. Parche residente sin streaming/horizonte.

## Siguiente dirección

Mantener musgo puro y barro independiente. No extender el shader de hierba de Sabana a este bioma. Antes de otro cambio de material, distinguir la falta de estructura superficial/vegetación de la integración entre superficies existentes. No dar por alcanzada la calidad de seis biomas.

Reproducir: `node tools/experiments/capture-mangrove-damp-moss.mjs` y `node tools/experiments/inspect-mangrove-moisture.mjs`, servidor5190. PNG publicados como WebP verificado sin pérdida.
