# Gran Cañón: sedimento por altura, diagnóstico negativo

Ensayo QA exclusivo: mismo material canyonSand=full y relleno cálido en ambos lados; candidato reduce depósito seco y oscurece color según altura sobre cota 3.28, con ruido suave. No cambia geometría, agua, edificios ni simulación. No integrado.

Doce capturas reales, semilla 712, media 1280×720, tres cámaras día/noche. Coinciden cámaras, horas, draw calls y triángulos en seis parejas; sin errores registrados. `comparison.json` conserva diferencias, que no se consideran prueba de mejora. Láminas `day-pair.webp` y `night-pair.webp`: control izquierda, candidato derecha.

Resultado artístico: la franja invade casi toda la terraza baja, oscurece la explanada y elimina buena parte del relieve visible de arena. El borde rectilíneo del agua sigue igual. No conservar como sustitución visual; sí como diagnóstico reproducible. El motivo es artístico y espacial, no rendimiento. No se hizo benchmark temporal de una variante que no mejora la dirección buscada. No hay muestras de textura adicionales; se añade evaluación de ruido y aritmética, cuyo coste no está medido.

La máscara groundSample417 deja humedad a cero para canyon/desert. La cota constante del río permite una aproximación por altura, pero no representa distancia lateral a la orilla: terrazas alejadas pueden compartir altura. Siguiente intento: construir una máscara visual de proximidad al agua a partir de información espacial existente, una vez por chunk, independiente de navegación, y conservar arena seca fuera de esa banda. No basta cambiar umbrales de altura.

Reproducción: Vite en 5190, `node tools/experiments/capture-canyon-bank-sediment.mjs`. La ruta `qa-canyon-bank-sediment.mjs` solo modifica la respuesta del módulo en Playwright.
