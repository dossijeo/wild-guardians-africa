# Gran Cañón: microvisibilidad solar con tres muestras de altura

**Descartar esta variante por contribución imperceptible.** Cambia solo 26–53 píxeles por captura diurna y ninguno nocturno. No mejora de forma reconocible el volumen de la grava; no justifica tres lecturas adicionales por fragmento.

[Vista cercana diurna media](media-day-2-pair.webp) · [Control nocturno](media-night-2-pair.webp)

Izquierda: grava .08 con suelo cálido. Derecha: microvisibilidad. Se mantienen textura, altura física .10, normales, color, cámara y geometría. La receta busca sombra entre piedras exclusivamente sobre el término solar; no vuelve a multiplicar AO ni ambiente. No cambia paredes ni sombras existentes.

## Método y resultado

Desde el UV desplazado del material se compara altura con tres puntos hacia el sol, a .05, .12 y .25 m. La altura usa B del ARH existente y amplitud física .10 m. Se resta la elevación del rayo solar y se suaviza el bloqueo entre 3 y 18 mm; máximo oscurecimiento solar 45 %, atenuado por pendiente plana y huella de píxel. Durante la noche se retira la contribución multiplicando su peso por 1-uNight.

24 capturas reales, 12 parejas: Gran Cañón semilla 712, 1280×720, media/baja, día 150/noche 350, tres poses sobre suelo despejado junto al río. Cámara, objetivo, hora, llamadas y triángulos coincidentes, sin errores registrados. La inspección del par cercano medio diurno no muestra mejora visible. Las seis parejas nocturnas son RGB exactas. [Trazas](captures.json), [comparación](comparison.json).

## Diagnóstico del recurso y del muestreo

El mapa empaquetado ocupa 14,5–100 mm con la amplitud actual; a escala .08 un texel representa unos 12,2 mm. La dirección solar efectiva viene de NATIVE_LIGHT_DIRECTION (-.82,.52,.31), con elevación horizontal .593. No usar la posición inicial de la luz como dirección final: updateShadowCamera la sustituye.

En un cálculo offline de resolución completa, las tres distancias bloquean apenas el 0,0384 % de texeles. Pendiente local central mediana .137, p90 .402 y p99 .886. Estos valores apuntan a un muestreo demasiado espaciado para parte del detalle y a poco bloqueo en esta configuración; no demuestran ausencia de relieve ni imposibilidad de autooclusión. El cálculo omite mipmaps, pendiente del mundo, POM y visibilidad de la escena. [Análisis](height-analysis.json).

Antes de ampliar profundidad o contraste, una siguiente prueba razonable es calcular offline un horizonte direccional con pasos más cortos del tamaño de texel, comprobar su señal y reutilizarlo como material. No añadir más muestras de shader a ciegas. La amplitud no se aumenta para forzar sombras.

## Coste y límites

No nuevas texturas, geometría, instancias o pasadas; tres lecturas ARH adicionales en la ruta plana del cañón. El código aún calcula esa señal de noche aunque su contribución visual sea cero: otro motivo para no promoverlo. Sin benchmark temporal al fallar la puerta artística. Igualdad de geometría no implica igualdad de tiempo GPU. Sin validación de movimiento o streaming de esta variante.

## Reproducción

```powershell
node tools/experiments/capture-canyon-microshadow.mjs
python tools/experiments/package-canyon-microshadow.py
python tools/experiments/analyze-canyon-microshadow-height.py
```

Vite 5190. PNG originales locales; dos pares, registros y herramientas publicados. Producción/main intactos; calidad global pendiente.
