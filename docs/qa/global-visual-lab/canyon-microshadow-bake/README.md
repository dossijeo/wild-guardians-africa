# Gran Cañón: microvisibilidad solar precalculada

**No incorporar: señal válida pero contribución visual insuficiente.** El precálculo de pasos cortos recupera pequeñas sombras ausentes en el piloto de tres muestras, pero la vista cercana inspeccionada no muestra un salto claro de volumen. No confundir más píxeles distintos con cumplimiento del objetivo artístico.

[Comparación cercana diurna](media-day-2-pair.webp) · [Control nocturno](media-night-2-pair.webp)

## Material reutilizable

Deriva el canal alfa del ARH de Ground079S existente, sin modificar RGB (comprobación exacta). Fuente: [ambientCG Ground079S](https://ambientcg.com/view?id=Ground079S), CC0. El mapa empaquetado conserva AO, rugosidad y altura originales y añade visibilidad solar en alfa. No se hornea por parcela; es una textura repetible reutilizable.

32 pasos de medio texel (6,10 mm) a escala UV .08 y amplitud de altura .10 m. Dirección solar (-.82,.52,.31), transformada al plano UV, con altura del rayo coherente; margen 1 mm y suavizado 3 mm, atenuación máxima 45 %. Muestreo periódico bilineal y corrección del eje Y de la textura. El cálculo encuentra bloqueo en 0,964 % de texeles, media de bloqueo .00605. [Parámetros, hashes y tamaños](height-analysis.json). El diagnóstico offline no incluye mipmaps, pendiente del terreno ni filtrado real de pantalla.

En el shader se lee alfa en la muestra ARH ya existente, en el mismo UV desplazado que color/normal/altura; solo afecta al término solar del suelo plano del cañón y se atenúa por huella de píxel. No se multiplica el ambiente ni el AO. Se anula de noche. La máscara de pendiente limita su uso a suelo plano, sin resolver inclinaciones arbitrarias con un solo precálculo.

## Capturas reales

24 capturas, 12 parejas: Gran Cañón semilla 712, 1280×720, baja/media, día 150/noche 350, tres poses de suelo despejado. Cámara, objetivo, hora, llamadas y triángulos iguales; sin errores registrados. Inspección del par cercano medio diurno.

Entre 11.244 y 22.988 píxeles diurnos cambian según pose/perfil, diferencia media de imagen 0,029–0,059/255. Las seis parejas nocturnas son exactas. Son diferencias medibles pero no un relieve colectivo nuevo. [Trazas](captures.json), [auditoría](comparison.json).

## Coste y decisión

No añade muestras de textura, geometría, llamadas o pasadas; sustituye el archivo ARH RGB por RGBA y añade un factor de iluminación. El tamaño de archivo aumenta; los bytes están registrados. No se mide VRAM ni tiempo GPU y no se afirma coste idéntico solo por reutilizar sampler. No se ejecuta benchmark temporal al no superar el criterio artístico. Sin validación de movimiento, streaming o escalas alternativas.

Se conserva el generador y la textura de prueba para reproducibilidad, desactivados. La amplitud no se aumenta para forzar sombras. El límite observado está en la escala y estructura del relieve del recurso: este precálculo resuelve microdetalle, no acumulaciones mesoscópicas. La siguiente propuesta debe abordar estructura de material mayor y contrastarla con la referencia completa, sin repetir ajustes equivalentes de microcontraste.

## Reproducción

```powershell
python tools/experiments/bake-canyon-microshadow.py
node tools/experiments/capture-canyon-microshadow-bake.mjs
python tools/experiments/package-canyon-microshadow-bake.py
```

Vite 5190. PNG fuente de captura locales; recurso derivado, dos pares y registros publicados. Producción, siluetas y main intactos. Calidad global pendiente.
