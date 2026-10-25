# Carbón volcánico — conservar en la opción experimental

El albedo del suelo se acerca a carbón neutro cálido conservando detalle, normales, rugosidad y AO originales. La luminancia de la fuente guía la mezcla; no se añaden emisión, texturas, geometría ni draws. No cambia modelos ni siluetas. Ocho capturas QA (dos cámaras, día/noche) y cuatro capturas de la ruta integrada.

La mejora es de paleta: desaparece parte del azul del terreno diurno y la roca convive mejor con los elementos cálidos. La noche sigue siendo oscura; no se afirma que este pase resuelva su iluminación. La escala del relieve y las grietas todavía distan de la referencia.

| Fase | GPU base → variante | CPU envío base → variante |
|---|---:|---:|
| day | 14.416 → 14.424 ms | 6.504 → 6.271 ms |
| night | 17.739 → 17.598 ms | 8.269 → 9.101 ms |

ABBA en la misma página, 180 frames por muestra. La ronda nocturna deriva de ~15 a ~20 ms incluso en referencia; no usar la media negativa como prueba de aceleración. Día: diferencia media +0,009 ms, sin regresión observada en esa ronda. Sin mapas ni buffers adicionales; no se midió VRAM residente. Los logs conservan un 404 de primera carga no identificado y las métricas completas.

Integrado únicamente bajo `?visualLab=global-lighting`, para materiales marcados como volcanoes. Sin parámetro se conserva el original. La medición QA anterior no sustituye la medición global final de la opción.

Para repetir el estudio después de integrar la corrección, los scripts QA desactivan únicamente su llamada en AfricanToon mediante interceptación de la respuesta local. Así reconstruyen la referencia previa y aplican el candidato una sola vez. La carpeta integrated/ prueba la ruta real sin esa interceptación.
